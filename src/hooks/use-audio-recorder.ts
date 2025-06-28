import { useState, useRef, useCallback } from 'react'

interface AudioRecorderOptions {
  languageCode?: string
  onTranscriptionStart?: () => void
  onTranscriptionComplete?: (transcript: string) => void
  onTranscriptionError?: (error: Error) => void
}

interface AudioRecorderReturn {
  isRecording: boolean
  isProcessing: boolean
  toggleRecording: () => void
  audioLevel: number
  isSpeaking: boolean
  reset: () => void
  clearProcessing: () => void
}

export function useAudioRecorder({
  languageCode = 'en-US',
  onTranscriptionStart,
  onTranscriptionComplete,
  onTranscriptionError
}: AudioRecorderOptions): AudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const recognitionRef = useRef<any>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)

  const startAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      
      analyser.fftSize = 256
      source.connect(analyser)
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
          const level = (average / 255) * 100
          
          setAudioLevel(level)
          setIsSpeaking(level > 5) // Threshold for speaking detection
          
          if (isRecording) {
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
          }
        }
      }

      updateAudioLevel()
    } catch (error) {
      console.error('Error setting up audio analysis:', error)
    }
  }, [isRecording])

  // Sound effects for microphone activation/deactivation
  const playActivateSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.type = 'sine'
      oscillator.frequency.value = 1000 // Higher pitch for activation
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      const now = audioContext.currentTime
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.5, now + 0.005)
      gainNode.gain.linearRampToValueAtTime(0, now + 0.15)
      
      oscillator.start(now)
      oscillator.stop(now + 0.2)
    } catch (error) {
      console.error('Error playing activate sound:', error)
    }
  }, [])

  const playDeactivateSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.type = 'sine'
      oscillator.frequency.value = 900 // Lower pitch for deactivation
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      const now = audioContext.currentTime
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.5, now + 0.01)
      gainNode.gain.linearRampToValueAtTime(0, now + 0.2)
      
      oscillator.start(now)
      oscillator.stop(now + 0.25)
    } catch (error) {
      console.error('Error playing deactivate sound:', error)
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      // Check if speech recognition is supported
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
      
      if (!SpeechRecognition) {
        throw new Error('Speech recognition is not supported in this browser')
      }

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      // Start audio analysis
      startAudioAnalysis(stream)

      // Set up speech recognition
      const recognition = new SpeechRecognition()
      recognition.continuous = true  // Keep recording continuously
      recognition.interimResults = true  // Get interim results
      recognition.lang = languageCode
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        setIsRecording(true)
        playActivateSound()
        onTranscriptionStart?.()
      }

      recognition.onresult = (event: any) => {
        let finalTranscript = ''
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript
          } else {
            interimTranscript += result[0].transcript
          }
        }
        
        // Store the final transcript
        if (finalTranscript) {
          recognitionRef.current.finalTranscript = finalTranscript
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsRecording(false)
        setIsProcessing(false)
        playDeactivateSound()
        onTranscriptionError?.(new Error(`Speech recognition error: ${event.error}`))
      }

      recognition.onend = () => {
        // Only process if we manually stopped (not automatic timeout)
        if (recognitionRef.current && recognitionRef.current.manualStop) {
          setIsRecording(false)
          playDeactivateSound()
          
          // Stop audio analysis
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current)
          }
          if (audioContextRef.current) {
            audioContextRef.current.close()
          }
          // Stop media stream
          stream.getTracks().forEach(track => track.stop())

          // Process transcript if we have one
          if (recognitionRef.current?.finalTranscript) {
            setIsProcessing(true)
            onTranscriptionComplete?.(recognitionRef.current.finalTranscript)
          }
        } else {
          // Automatic restart if it ended unexpectedly (timeout)
          if (isRecording && recognitionRef.current) {
            console.log('Speech recognition ended unexpectedly, restarting...')
            try {
              recognitionRef.current.start()
            } catch (error) {
              console.error('Error restarting recognition:', error)
              // If restart fails, treat as manual stop
              setIsRecording(false)
              playDeactivateSound()
            }
          }
        }
      }

      recognitionRef.current = recognition
      recognitionRef.current.manualStop = false // Initialize manual stop flag
      recognition.start()

    } catch (error) {
      console.error('Error starting recording:', error)
      setIsRecording(false)
      onTranscriptionError?.(error as Error)
    }
  }, [languageCode, onTranscriptionStart, onTranscriptionComplete, onTranscriptionError, startAudioAnalysis, playActivateSound, playDeactivateSound])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      // Mark as manual stop so onend handler processes the transcript
      recognitionRef.current.manualStop = true
      recognitionRef.current.stop()
    }
  }, [])

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  const clearProcessing = useCallback(() => {
    setIsProcessing(false)
  }, [])

  const reset = useCallback(() => {
    // Stop any ongoing recording
    if (recognitionRef.current) {
      recognitionRef.current.manualStop = true // Prevent auto-restart
      recognitionRef.current.stop()
    }
    
    // Reset all states
    setIsRecording(false)
    setIsProcessing(false)
    setAudioLevel(0)
    setIsSpeaking(false)
    
    // Clear animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    // Close audio context only if it's not already closed
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
    }
    
    // Clear refs
    recognitionRef.current = null
    audioContextRef.current = null
    analyserRef.current = null
  }, [])

  return {
    isRecording,
    isProcessing,
    toggleRecording,
    audioLevel,
    isSpeaking,
    reset,
    clearProcessing
  }
}

// Extend the Window interface to include speech recognition
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
} 