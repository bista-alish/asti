import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'
import { tools } from './tools.ts'
import { executeTool } from './executor.ts'

const SYSTEM_INSTRUCTION = `You are Asti, an AI assistant for an attendance tracking system used in classrooms and cohort training programs.

You help instructors and administrators manage attendance, view reports, and manage modules and enrollments.

Guidelines:
- Be concise and friendly.
- When listing students or attendance, format clearly with counts.
- For bulk operations, briefly confirm what you're about to do before doing it (only if there are 5+ entries).
- If a name is ambiguous, ask the user to be more specific.
- When dates are mentioned like "today", "yesterday", or day names, interpret them relative to the current date.
- If you don't have enough information to use a tool, ask for it.
- After successfully marking attendance, suggest the user refresh the page to see the updated data.`

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // Auth check
    const { userId, role } = await requireAuth(req)

    // Parse request body
    const { messages } = await req.json()
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages must be an array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize Gemini
    const gemini = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!)
    const model = gemini.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
      tools,
    })

    // Build conversation history for multi-turn chat
    // Convert our message format to Gemini's format
    const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const lastMessage = messages[messages.length - 1]
    const chat = model.startChat({ history })

    // Create admin Supabase client for tool execution
    const db = createAdminClient()

    // Multi-turn tool-calling loop
    const toolCallsSummary: Array<{ tool: string; result: string }> = []
    let finalText = ''
    let currentMessage = lastMessage.content

    for (let iteration = 0; iteration < 10; iteration++) {
      const result = await chat.sendMessage(currentMessage)
      const response = result.response

      // Check if Gemini wants to call a function
      const functionCalls = response.functionCalls()

      if (!functionCalls || functionCalls.length === 0) {
        // No more tool calls — we have the final text response
        finalText = response.text()
        break
      }

      // Execute each function call
      const functionResponses = []
      for (const fc of functionCalls) {
        const toolResult = await executeTool(db, fc.name, fc.args as Record<string, unknown>, role)
        toolCallsSummary.push({ tool: fc.name, result: toolResult })
        functionResponses.push({
          functionResponse: {
            name: fc.name,
            response: { result: toolResult },
          },
        })
      }

      // Feed tool results back to Gemini
      currentMessage = functionResponses as any
    }

    if (!finalText) {
      finalText = 'I was unable to complete the request. Please try again.'
    }

    return new Response(
      JSON.stringify({ message: finalText, tool_calls: toolCallsSummary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    if (err instanceof Response) return err

    console.error('Chat function error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
