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

// Mobile detection and browser capabilities
const isMobile = () => {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

const isIOS = () => {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

const isSafari = () => {
  if (typeof navigator === 'undefined') return false
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

const isHTTPS = () => {
  return typeof window !== 'undefined' && window.location.protocol === 'https:'
}

const isLocalhost = () => {
  if (typeof window === 'undefined') return false
  const hostname = window.location.hostname
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

const isLocalIP = () => {
  if (typeof window === 'undefined') return false
  const hostname = window.location.hostname
  // Match local IP patterns like 192.168.x.x, 10.x.x.x, 172.16-31.x.x
  return /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(hostname)
}

const checkMediaDevicesSupport = () => {
  if (typeof navigator === 'undefined') {
    return { supported: false, error: 'Navigator not available' }
  }

  if (!navigator.mediaDevices) {
    return { supported: false, error: 'MediaDevices API not available' }
  }

  if (!navigator.mediaDevices.getUserMedia) {
    return { supported: false, error: 'getUserMedia not available' }
  }

  // Check for HTTPS requirement on iOS
  if (isIOS() && !isHTTPS()) {
    if (isLocalIP()) {
      return { 
        supported: false, 
        error: 'Local IP requires HTTPS on iOS Safari for microphone access. Use localhost or enable HTTPS.' 
      }
    } else if (isLocalhost()) {
      // Localhost should work on iOS Safari even without HTTPS, but might have issues
      return { 
        supported: true, 
        error: null,
        warning: 'Localhost on iOS Safari may have microphone limitations. Consider using HTTPS.' 
      }
    } else {
      return { 
        supported: false, 
        error: 'HTTPS required for microphone access on iOS Safari' 
      }
    }
  }

  return { supported: true, error: null }
}

const getSpeechRecognitionSupport = () => {
  const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
  const isSupported = !!SpeechRecognition
  const isMobileDevice = isMobile()
  const isIOSDevice = isIOS()
  const isSafariBrowser = isSafari()
  
  return {
    SpeechRecognition,
    isSupported,
    isMobileDevice,
    isIOSDevice,
    isSafariBrowser,
    hasLimitations: isMobileDevice || (isIOSDevice && isSafariBrowser)
  }
}

const getMobileFriendlyErrorMessage = (error: string, speechSupport: any, mediaSupport?: any) => {
  // Handle getUserMedia specific errors first
  if (mediaSupport && !mediaSupport.supported) {
    if (mediaSupport.error === 'Local IP requires HTTPS on iOS Safari for microphone access. Use localhost or enable HTTPS.') {
      return `🔧 Local Development Issue: iOS Safari requires HTTPS for microphone access, even on local networks.

Solutions:
1. Use localhost instead: http://localhost:3000
2. Enable HTTPS for local development
3. Test on a desktop browser for now

Current URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`
    }
    if (mediaSupport.error === 'HTTPS required for microphone access on iOS Safari') {
      return 'Microphone access requires a secure connection (HTTPS) on iOS Safari. Please access this site using HTTPS.'
    }
    if (mediaSupport.error === 'MediaDevices API not available') {
      return 'Your browser does not support microphone access. Please try using a different browser or update your current browser.'
    }
    if (mediaSupport.error === 'getUserMedia not available') {
      return 'Microphone access is not available in your browser. This may be due to privacy settings or browser limitations.'
    }
    return `Microphone access error: ${mediaSupport.error}`
  }

  // Handle speech recognition errors
  if (speechSupport.isIOSDevice) {
    switch (error) {
      case 'aborted':
        return 'Voice recognition was interrupted on iOS. This is common on mobile devices. Please try again by tapping the microphone button.'
      case 'network':
        return 'Network connection required for voice recognition on iOS. Please check your internet connection and try again.'
      case 'no-speech':
        return 'No speech detected. Please speak clearly into your device microphone and try again.'
      default:
        return `Voice recognition error on iOS: ${error}. Mobile voice recognition has limitations, but you can still record audio.`
    }
  } else if (speechSupport.isMobileDevice) {
    switch (error) {
      case 'aborted':
        return 'Voice recognition was stopped. This can happen on mobile devices. Please try recording again.'
      case 'network':
        return 'Internet connection required for voice recognition. Please check your connection and try again.'
      case 'no-speech':
        return 'No speech detected. Please speak closer to your device microphone.'
      default:
        return `Voice recognition error: ${error}. Mobile devices may have limited voice recognition, but audio recording still works.`
    }
  }
  
  return `Speech recognition error: ${error}`
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
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const restartAttemptsRef = useRef<number>(0)
  const maxRestartAttempts = 3
  const dataCollectionRef = useRef<NodeJS.Timeout | null>(null)

  const startAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      
      analyser.fftSize = 512  // Increased for better frequency resolution
      analyser.smoothingTimeConstant = 0.3  // Smoother transitions
      source.connect(analyser)
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateAudioLevel = () => {
        if (analyserRef.current && audioContextRef.current && audioContextRef.current.state !== 'closed') {
          // Use time domain data for more accurate volume detection
          analyserRef.current.getByteTimeDomainData(dataArray)
          
          // Calculate RMS of the time domain data
          let sumSquares = 0
          for (let i = 0; i < dataArray.length; i++) {
            const normalized = (dataArray[i] - 128) / 128  // Normalize to -1 to 1
            sumSquares += normalized * normalized
          }
          const rms = Math.sqrt(sumSquares / dataArray.length)
          
          // Convert to percentage with enhanced scaling for better visibility
          const level = Math.min(rms * 600, 100) // Multiply by 6 for more sensitive range (2x more sensitive)
          
          setAudioLevel(level)
          setIsSpeaking(level > 5) // Threshold for speaking detection
          
          // Continue animation frame regardless of isRecording state to ensure smooth updates
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
        }
      }

      updateAudioLevel()
    } catch (error) {
      console.error('Error setting up audio analysis:', error)
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setTranscript('')
      latestTranscriptRef.current = ''
      restartAttemptsRef.current = 0
      onTranscriptionStart?.()

      // Check if getUserMedia is available before attempting to use it
      const mediaSupport = checkMediaDevicesSupport()
      if (!mediaSupport.supported) {
        const errorMessage = getMobileFriendlyErrorMessage('', getSpeechRecognitionSupport(), mediaSupport)
        throw new Error(errorMessage)
      }

      const speechSupport = getSpeechRecognitionSupport()
      
      // Request microphone permission with enhanced mobile settings
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Enhanced settings for mobile
          channelCount: 1,
          sampleRate: speechSupport.isMobileDevice ? 16000 : 44100,
          // @ts-ignore - Enhanced mobile constraints
          googEchoCancellation: true,
          googAutoGainControl: true,
          googNoiseSuppression: true,
          googHighpassFilter: true,
          googTypingNoiseDetection: speechSupport.isMobileDevice ? false : true,
          googAudioMirroring: false
        }
      })

      streamRef.current = stream

      // Start audio analysis
      startAudioAnalysis(stream)

      // Set up MediaRecorder for audio capture with mobile-friendly format
      let mimeType = "audio/webm"
      
      // Try different MIME types in order of mobile compatibility
      const mimeTypes = [
        'audio/webm',
        'audio/mp4', 
        'audio/wav',
        'audio/ogg',
        'audio/mpeg',
        'audio/mpga',
        'audio/x-m4a',
        'audio/m4a'
      ]
      
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type
          break
        }
      }
      
      let mediaRecorderOptions: any = {}
      if (mimeType && MediaRecorder.isTypeSupported(mimeType)) {
        mediaRecorderOptions.mimeType = mimeType
        // Add audio bit rate for better quality/compatibility
        mediaRecorderOptions.audioBitsPerSecond = 128000
      }
      
      const mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        } else {
          console.warn("Empty data chunk received")
        }
      }
      
      mediaRecorder.onstop = async () => {
        try {
          // Get final data chunk before processing
          try {
            mediaRecorder.requestData()
          } catch (e) {
            console.warn("Error requesting final data:", e)
          }
          
          // Wait a brief moment for final data to arrive
          setTimeout(async () => {
            if (chunksRef.current.length === 0) {
              console.error("No audio chunks collected")
              const error = new Error("No audio was captured")
              onTranscriptionError?.(error)
              setIsProcessing(false)
              return
            }
            
            const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" })
            
            if (blob.size < 100) {
              console.error("Audio blob is too small, likely no audio captured")
              const error = new Error("Audio file too small - no audio captured")
              onTranscriptionError?.(error)
              setIsProcessing(false)
              return
            }
            
            const audioFile = new File([blob], "recording.webm", { type: blob.type })
            
            setIsProcessing(true)
            
            // Use the latest transcript from ref (more reliable than state)
            const finalTranscript = latestTranscriptRef.current.trim()
            
            // Process transcript and audio - always call the callback even with empty transcript
            onTranscriptionComplete?.(finalTranscript, audioFile)
          }, 100)
        } catch (error) {
          console.error('Error processing recording:', error)
          onTranscriptionError?.(error as Error)
        } finally {
          setIsProcessing(false)
        }
      }

      // Start recorder with small time slice for better data collection
      mediaRecorder.start(250) // Collect data every 250ms
      
      // Force data collection at regular intervals - THIS IS KEY FOR MOBILE
      dataCollectionRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          try {
            mediaRecorderRef.current.requestData()
          } catch (e) {
            console.warn("Error requesting data:", e)
          }
        } else if (dataCollectionRef.current) {
          clearInterval(dataCollectionRef.current)
          dataCollectionRef.current = null
        }
      }, 250) // Request data every 250ms

      // Set up Speech Recognition with mobile-specific handling
      if (speechSupport.isSupported) {
        try {
          const recognition = new speechSupport.SpeechRecognition()
          recognition.lang = languageCode
          recognition.continuous = !speechSupport.hasLimitations // Disable continuous on mobile
          recognition.interimResults = !speechSupport.isIOSDevice // iOS has issues with interim results
          
          // Mobile-specific settings
          if (speechSupport.hasLimitations) {
            recognition.maxAlternatives = 1
            // Set shorter timeout for mobile to prevent aborts
            speechTimeoutRef.current = setTimeout(() => {
              if (speechRecRef.current && isRecording) {
                console.log('Speech recognition timeout on mobile, restarting...')
                restartSpeechRecognition()
              }
            }, 15000) // 15 seconds for mobile
          }

          recognition.onresult = (event: any) => {
            // Clear any existing timeout
            if (speechTimeoutRef.current) {
              clearTimeout(speechTimeoutRef.current)
              speechTimeoutRef.current = null
            }

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
            
            // Reset restart attempts on successful result
            restartAttemptsRef.current = 0
          }

          recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error)
            
            // Handle specific mobile errors
            if (speechSupport.hasLimitations && 
                (event.error === 'aborted' || event.error === 'network')) {
              // Try to restart on mobile for these common errors
              if (restartAttemptsRef.current < maxRestartAttempts && isRecording) {
                console.log(`Attempting to restart speech recognition (${restartAttemptsRef.current + 1}/${maxRestartAttempts})`)
                setTimeout(() => restartSpeechRecognition(), 1000)
                return
              }
            }
            
            // Only show error if we can't restart or have exhausted attempts
            const friendlyMessage = getMobileFriendlyErrorMessage(event.error, speechSupport)
            onTranscriptionError?.(new Error(friendlyMessage))
          }

          recognition.onend = () => {
            // Auto-restart on mobile if still recording and haven't reached max attempts
            if (speechSupport.hasLimitations && isRecording && 
                restartAttemptsRef.current < maxRestartAttempts) {
              console.log('Speech recognition ended unexpectedly, restarting...')
              setTimeout(() => restartSpeechRecognition(), 500)
            }
          }

          const restartSpeechRecognition = () => {
            if (restartAttemptsRef.current >= maxRestartAttempts || !isRecording) return
            
            try {
              restartAttemptsRef.current++
              if (speechRecRef.current) {
                speechRecRef.current.stop()
              }
              
              setTimeout(() => {
                if (isRecording) {
                  speechRecRef.current = recognition
                  recognition.start()
                }
              }, 100)
            } catch (error) {
              console.error('Error restarting speech recognition:', error)
            }
          }

          recognition.start()
          speechRecRef.current = recognition
        } catch (error) {
          console.error('Speech recognition not available:', error)
          // Continue without speech recognition - audio will still be recorded
        }
      }

      setIsRecording(true)

    } catch (error) {
      console.error('Error starting recording:', error)
      onTranscriptionError?.(error as Error)
    }
  }, [languageCode, onTranscriptionStart, onTranscriptionComplete, onTranscriptionError, startAudioAnalysis, isRecording])

  const stopRecording = useCallback(() => {
    setIsRecording(false)

    // Clear speech timeout
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current)
      speechTimeoutRef.current = null
    }

    // Clear data collection interval
    if (dataCollectionRef.current) {
      clearInterval(dataCollectionRef.current)
      dataCollectionRef.current = null
    }

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
      animationFrameRef.current = undefined
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
    }
    
    // Reset audio level and restart attempts
    setAudioLevel(0)
    setIsSpeaking(false)
    restartAttemptsRef.current = 0
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
    
    // Clear speech timeout
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current)
      speechTimeoutRef.current = null
    }

    // Clear data collection interval
    if (dataCollectionRef.current) {
      clearInterval(dataCollectionRef.current)
      dataCollectionRef.current = null
    }
    
    // Stop audio analysis animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = undefined
    }
    
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
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
    restartAttemptsRef.current = 0
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
