import { supabase } from './supabase'

const CHAT_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`

/**
 * Sends a conversation to the Gemini chat Edge Function.
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<{message: string, tool_calls?: Array}>}
 */
/**
 * @param {Array<{role: string, content: string}>} messages
 * @param {string} [accessToken] - pass session.access_token from AuthContext (preferred)
 */
export async function sendChatMessage(messages, accessToken) {
  // Use the provided token from context; fall back to getSession() only if not provided
  let token = accessToken
  if (!token) {
    const { data: { session } } = await supabase.auth.getSession()
    token = session?.access_token
  }
  if (!token) throw new Error('Not authenticated')

  const res = await fetch(CHAT_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ messages }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Chat request failed: ${res.status}`)
  }

  return res.json()
}
