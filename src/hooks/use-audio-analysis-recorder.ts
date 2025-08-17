import { useState, useRef, useCallback } from 'react'

interface AudioAnalysisRecorderOptions {
  languageCode?: string
  onTranscriptionStart?: () => void
  onTranscriptionComplete?: (transcript: string, audioFile: File) => void
  onTranscriptionError?: (error: Error) => void
}

interface AudioAnalysisRecorderReturn {
  isRecording: boolean
  isProcessing: boolean
  transcript: string
  toggleRecording: () => void
  audioLevel: number
  isSpeaking: boolean
  reset: () => void
  clearProcessing: () => void
}

export function useAudioAnalysisRecorder({
  languageCode = 'en-US',
  onTranscriptionStart,
  onTranscriptionComplete,
  onTranscriptionError
}: AudioAnalysisRecorderOptions): AudioAnalysisRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const speechRecRef = useRef<any>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const animationFrameRef = useRef<number | undefined>(undefined)
  const streamRef = useRef<MediaStream | null>(null)
  const latestTranscriptRef = useRef<string>('')

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

  const startRecording = useCallback(async () => {
    try {
      setTranscript('')
      latestTranscriptRef.current = ''
      onTranscriptionStart?.()
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      streamRef.current = stream

      // Start audio analysis
      startAudioAnalysis(stream)

      // Set up MediaRecorder for audio capture
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" })
          const audioFile = new File([blob], "recording.webm", { type: blob.type })
          
          setIsProcessing(true)
          
          // Use the latest transcript from ref (more reliable than state)
          const finalTranscript = latestTranscriptRef.current.trim()
          console.log('MediaRecorder stopped. Final transcript:', finalTranscript)
          console.log('Audio file size:', audioFile.size, 'bytes')
          
          // Process transcript and audio - always call the callback even with empty transcript
          onTranscriptionComplete?.(finalTranscript, audioFile)
        } catch (error) {
          console.error('Error processing recording:', error)
          onTranscriptionError?.(error as Error)
        } finally {
          setIsProcessing(false)
        }
      }

      mediaRecorder.start()

      // Set up Speech Recognition
      try {
        const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition()
          recognition.lang = languageCode
          recognition.continuous = true
          recognition.interimResults = true

          recognition.onresult = (event: any) => {
            let fullTranscript = ""
            for (let i = 0; i < event.results.length; i++) {
              const result = event.results[i]
              if (result && result[0]) {
                fullTranscript += result[0].transcript
              }
            }
            const trimmedTranscript = fullTranscript.trim()
            setTranscript(trimmedTranscript)
            latestTranscriptRef.current = trimmedTranscript
          }

          recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error)
            onTranscriptionError?.(new Error(`Speech recognition error: ${event.error}`))
          }

          recognition.onend = () => {
            // Recognition ended, but we'll handle this in stop recording
          }

          recognition.start()
          speechRecRef.current = recognition
        }
      } catch (error) {
        console.error('Speech recognition not available:', error)
      }

      setIsRecording(true)

    } catch (error) {
      console.error('Error starting recording:', error)
      onTranscriptionError?.(error as Error)
    }
  }, [languageCode, onTranscriptionStart, onTranscriptionComplete, onTranscriptionError, startAudioAnalysis, transcript])

  const stopRecording = useCallback(() => {
    setIsRecording(false)

    // Stop MediaRecorder
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
    }

    // Stop Speech Recognition
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop()
      } catch (error) {
        console.error('Error stopping speech recognition:', error)
      }
      speechRecRef.current = null
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    // Stop audio analysis
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
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
    if (isRecording) {
      stopRecording()
    }
    
    // Reset all states
    setIsRecording(false)
    setIsProcessing(false)
    setTranscript('')
    setAudioLevel(0)
    setIsSpeaking(false)
    
    // Clear refs
    mediaRecorderRef.current = null
    audioContextRef.current = null
    analyserRef.current = null
    speechRecRef.current = null
    streamRef.current = null
    chunksRef.current = []
    latestTranscriptRef.current = ''
  }, [isRecording, stopRecording])

  return {
    isRecording,
    isProcessing,
    transcript,
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
