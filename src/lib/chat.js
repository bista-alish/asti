import { supabase } from './supabase'

const CHAT_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`

/**
 * Sends a conversation to the Gemini chat Edge Function.
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<{message: string, tool_calls?: Array}>}
 */
export async function sendChatMessage(messages) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const res = await fetch(CHAT_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ messages }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Chat request failed: ${res.status}`)
  }

  return res.json()
}
