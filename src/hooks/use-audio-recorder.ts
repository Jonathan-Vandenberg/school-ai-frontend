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
        return `Voice recognition error on iOS: ${error}. Mobile voice recognition has limitations, but you can continue using the app.`
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
        return `Voice recognition error: ${error}. Mobile devices may have limited voice recognition support.`
    }
  }
  
  return `Speech recognition error: ${error}`
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
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const restartAttemptsRef = useRef<number>(0)
  const maxRestartAttempts = 3
  const streamRef = useRef<MediaStream | null>(null)
  const dataCollectionRef = useRef<NodeJS.Timeout | null>(null)

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
        if (analyserRef.current && audioContextRef.current && audioContextRef.current.state !== 'closed') {
          analyserRef.current.getByteFrequencyData(dataArray)
          
          // Use multiple methods to get a more accurate reading
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
          const max = Math.max(...dataArray)
          const rms = Math.sqrt(dataArray.reduce((sum, value) => sum + value * value, 0) / dataArray.length)
          
          // Combine average and RMS for better sensitivity, with amplification
          const combinedLevel = Math.max(average, rms * 0.7) * 1.5 // Amplify by 2.5x
          const level = Math.min(combinedLevel, 100) // Cap at 100%
          
          setAudioLevel(level)
          setIsSpeaking(level > 8) // Lower threshold for better detection
          
          // Continue animation as long as we have an analyser
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
        }
      }

      updateAudioLevel()
    } catch (error) {
      console.error('Error setting up audio analysis:', error)
    }
  }, [])

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
      const speechSupport = getSpeechRecognitionSupport()
      
      if (!speechSupport.isSupported) {
        throw new Error('Speech recognition is not supported in this browser')
      }

      // Check if getUserMedia is available before attempting to use it
      const mediaSupport = checkMediaDevicesSupport()
      if (!mediaSupport.supported) {
        const errorMessage = getMobileFriendlyErrorMessage('', speechSupport, mediaSupport)
        throw new Error(errorMessage)
      }

      restartAttemptsRef.current = 0

      // Request microphone permission with enhanced isolation settings for mobile
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,        // Cancel echo from speakers
          noiseSuppression: true,        // Suppress background noise
          autoGainControl: true,         // Automatic gain control
          channelCount: 1,              // Mono to reduce system audio pickup
          sampleRate: speechSupport.isMobileDevice ? 16000 : 44100,
          // @ts-ignore - Advanced constraints for better isolation
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

      // Set up speech recognition with mobile-specific configuration
      const recognition = new speechSupport.SpeechRecognition()
      recognition.continuous = !speechSupport.hasLimitations  // Keep recording continuously on desktop
      recognition.interimResults = !speechSupport.isIOSDevice  // Get interim results on non-iOS
      recognition.lang = languageCode
      recognition.maxAlternatives = 1

      // Mobile-specific timeout to prevent aborts
      if (speechSupport.hasLimitations) {
        speechTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current && isRecording) {
            console.log('Speech recognition timeout on mobile, restarting...')
            restartSpeechRecognition()
          }
        }, 15000) // 15 seconds for mobile
      }

      const restartSpeechRecognition = () => {
        if (restartAttemptsRef.current >= maxRestartAttempts || !isRecording) return
        
        try {
          restartAttemptsRef.current++
          if (recognitionRef.current) {
            recognitionRef.current.manualStop = false
            recognitionRef.current.stop()
          }
          
          setTimeout(() => {
            if (isRecording) {
              recognitionRef.current = recognition
              recognition.start()
            }
          }, 100)
        } catch (error) {
          console.error('Error restarting speech recognition:', error)
        }
      }

      recognition.onstart = () => {
        setIsRecording(true)
        playActivateSound()
        onTranscriptionStart?.()
      }

      recognition.onresult = (event: any) => {
        // Clear timeout on successful result
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current)
          speechTimeoutRef.current = null
        }

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
        
        // Reset restart attempts on successful result
        restartAttemptsRef.current = 0
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        
        // Handle specific mobile errors with restart attempts
        if (speechSupport.hasLimitations && 
            (event.error === 'aborted' || event.error === 'network' || event.error === 'no-speech')) {
          // Try to restart on mobile for these common errors
          if (restartAttemptsRef.current < maxRestartAttempts && isRecording) {
            console.log(`Attempting to restart speech recognition (${restartAttemptsRef.current + 1}/${maxRestartAttempts})`)
            setTimeout(() => restartSpeechRecognition(), 1000)
            return
          }
        }
        
        // Only show error if we can't restart or have exhausted attempts
        setIsRecording(false)
        setIsProcessing(false)
        playDeactivateSound()
        const friendlyMessage = getMobileFriendlyErrorMessage(event.error, speechSupport)
        onTranscriptionError?.(new Error(friendlyMessage))
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
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
          }

          // Process transcript if we have one
          if (recognitionRef.current?.finalTranscript) {
            setIsProcessing(true)
            onTranscriptionComplete?.(recognitionRef.current.finalTranscript)
          }
        } else {
          // Auto-restart on mobile if still recording and haven't reached max attempts
          if (speechSupport.hasLimitations && isRecording && 
              restartAttemptsRef.current < maxRestartAttempts) {
            console.log('Speech recognition ended unexpectedly, restarting...')
            setTimeout(() => restartSpeechRecognition(), 500)
          } else if (isRecording && recognitionRef.current) {
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
  }, [languageCode, onTranscriptionStart, onTranscriptionComplete, onTranscriptionError, startAudioAnalysis, playActivateSound, playDeactivateSound, isRecording])

  const stopRecording = useCallback(() => {
    // Clear speech timeout
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current)
      speechTimeoutRef.current = null
    }

    if (recognitionRef.current) {
      // Mark as manual stop so onend handler processes the transcript
      recognitionRef.current.manualStop = true
      recognitionRef.current.stop()
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    // Reset restart attempts
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
    if (recognitionRef.current) {
      recognitionRef.current.manualStop = true // Prevent auto-restart
      recognitionRef.current.stop()
    }
    
    // Clear speech timeout
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current)
      speechTimeoutRef.current = null
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
    
    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    // Clear refs
    recognitionRef.current = null
    audioContextRef.current = null
    analyserRef.current = null
    restartAttemptsRef.current = 0
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