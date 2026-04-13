import { useState, useRef, useCallback } from 'react'

/**
 * useVoiceInput — wraps the Web Speech API for voice-to-text input.
 *
 * Options:
 *   onResult(transcript)       — called continuously with interim results
 *   onFinalResult(transcript)  — called once when speech ends with the final transcript
 *
 * Returns:
 *   isSupported  — false if the browser doesn't support SpeechRecognition
 *   isListening  — true while recording
 *   startListening() — start listening
 *   stopListening()  — stop listening
 */
export function useVoiceInput({ onResult, onFinalResult } = {}) {
  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null

  const isSupported = Boolean(SpeechRecognition)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)

  const startListening = useCallback(() => {
    if (!isSupported) return
    setError(null)

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }
      const current = final || interim
      if (current && onResult) onResult(current)
    }

    recognition.onend = () => {
      setIsListening(false)
      // Get the last result as final
      if (recognitionRef.current?._lastTranscript && onFinalResult) {
        onFinalResult(recognitionRef.current._lastTranscript)
      }
      recognitionRef.current = null
    }

    recognition.onspeechend = () => recognition.stop()

    recognition.onerror = (event) => {
      setIsListening(false)
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(event.error)
      }
      recognitionRef.current = null
    }

    // Patch: track last transcript for onend
    const originalOnResult = recognition.onresult
    recognition.onresult = (event) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        }
      }
      if (finalTranscript) recognition._lastTranscript = finalTranscript
      originalOnResult(event)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [isSupported, onResult, onFinalResult])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return { isSupported, isListening, error, startListening, stopListening }
}
