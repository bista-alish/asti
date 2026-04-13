import { useState, useCallback } from 'react'
import { sendChatMessage } from '../lib/chat'

/**
 * Manages the chatbot conversation state.
 * Returns messages, loading state, and a sendMessage function.
 */
export function useChat() {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return

    const userMessage = { role: 'user', content: text.trim() }
    const updatedMessages = [...messages, userMessage]

    setMessages(updatedMessages)
    setIsLoading(true)
    setError(null)

    try {
      const response = await sendChatMessage(updatedMessages)
      const assistantMessage = { role: 'assistant', content: response.message }
      setMessages(prev => [...prev, assistantMessage])

      // If data was modified, dispatch a custom event so pages can refresh
      const mutationTools = ['mark_attendance', 'mark_bulk_attendance', 'create_module', 'set_active_module', 'enroll_student', 'unenroll_student']
      const hasDataChange = response.tool_calls?.some(tc => mutationTools.includes(tc.tool))
      if (hasDataChange) {
        window.dispatchEvent(new CustomEvent('asti:data-changed'))
      }
    } catch (err) {
      setError(err.message)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Error: ${err.message}` },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [messages])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return { messages, isLoading, error, sendMessage, clearMessages }
}
