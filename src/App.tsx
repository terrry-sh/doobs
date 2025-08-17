import { useState, useEffect, useRef } from 'react'
import {
  IonApp,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonText,
  IonChip,
  IonLabel,
  IonAlert,
  setupIonicReact
} from '@ionic/react'
import { micOutline, micOffOutline, refreshOutline } from 'ionicons/icons'
import './theme.css'

setupIonicReact()

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

function App() {
  const [transcript, setTranscript] = useState<string>('')
  const [isListening, setIsListening] = useState<boolean>(false)
  const [interimTranscript, setInterimTranscript] = useState<string>('')
  const [isSupported, setIsSupported] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [showPermissionAlert, setShowPermissionAlert] = useState<boolean>(false)
  const recognitionRef = useRef<any>(null)
  const restartTimeoutRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      setIsSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      console.log('Speech recognition started')
      setErrorMessage('')
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = ''
      let finalText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript + ' '
        } else {
          interimText += result[0].transcript
        }
      }

      if (finalText) {
        setTranscript(prev => prev + finalText)
        setInterimTranscript('')
      } else {
        setInterimTranscript(interimText)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      
      if (event.error === 'not-allowed') {
        setErrorMessage('Microphone access denied. Please enable microphone permissions in your device settings.')
        setShowPermissionAlert(true)
        setIsListening(false)
      } else if (event.error === 'no-speech') {
        console.log('No speech detected, continuing...')
        // On Safari iOS, we might need to restart after no-speech
        if (isListening && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
          restartTimeoutRef.current = setTimeout(() => {
            if (recognitionRef.current && isListening) {
              try {
                recognitionRef.current.start()
              } catch (e) {
                console.log('Already started')
              }
            }
          }, 100)
        }
      } else if (event.error === 'audio-capture') {
        setErrorMessage('No microphone found. Please ensure a microphone is connected.')
        setIsListening(false)
      } else if (event.error === 'network') {
        setErrorMessage('Network error. Please check your internet connection.')
        setIsListening(false)
      } else if (event.error === 'aborted') {
        // This is usually fine, happens when we stop manually
        console.log('Recognition aborted')
      } else {
        setErrorMessage(`Error: ${event.error}`)
        setIsListening(false)
      }
    }

    recognition.onend = () => {
      console.log('Speech recognition ended')
      // On Safari iOS, recognition might end unexpectedly, so restart if still listening
      if (isListening && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
        restartTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current && isListening) {
            try {
              recognitionRef.current.start()
              console.log('Restarted recognition')
            } catch (e) {
              console.log('Could not restart:', e)
            }
          }
        }, 100)
      } else {
        setIsListening(false)
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
    }
  }, [isListening])

  const toggleListening = async () => {
    if (!recognitionRef.current) return

    if (isListening) {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
      recognitionRef.current.stop()
      setIsListening(false)
      setInterimTranscript('')
    } else {
      try {
        // For iOS Safari, we need to handle permissions differently
        if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.navigator.standalone) {
          // Check if we're in Safari (not in standalone PWA mode)
          setErrorMessage('')
        }
        
        await recognitionRef.current.start()
        setIsListening(true)
        setErrorMessage('')
      } catch (error: any) {
        console.error('Error starting recognition:', error)
        if (error.message && error.message.includes('already started')) {
          // Recognition is already started, just update the state
          setIsListening(true)
        } else {
          setErrorMessage('Failed to start recording. Please try again.')
        }
      }
    }
  }

  const clearTranscript = () => {
    setTranscript('')
    setInterimTranscript('')
    setErrorMessage('')
  }

  return (
    <IonApp>
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/doobs-icon.svg" alt="Doobs" style={{ width: '32px', height: '32px' }} />
                Doobs
              </div>
            </IonTitle>
          </IonToolbar>
        </IonHeader>
        
        <IonContent className="ion-padding">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <IonCard style={{ background: 'var(--dracula-current-line)', marginTop: '2rem' }}>
              <IonCardHeader>
                <IonCardTitle style={{ textAlign: 'center', color: 'var(--dracula-purple)' }}>
                  Speech to Text
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {!isSupported ? (
                  <IonText color="danger">
                    <p style={{ textAlign: 'center' }}>
                      Speech recognition is not supported in this browser.
                      Please use Chrome, Edge, or Safari (iOS 14.5+).
                    </p>
                  </IonText>
                ) : (
                  <>
                    {errorMessage && (
                      <IonText color="warning">
                        <p style={{ textAlign: 'center', marginBottom: '1rem' }}>
                          {errorMessage}
                        </p>
                      </IonText>
                    )}

                    {isListening && (
                      <div className="listening-indicator">
                        Listening...
                      </div>
                    )}
                    
                    <div className="speech-text">
                      {transcript || interimTranscript || 'Tap the microphone to start speaking...'}
                      {interimTranscript && (
                        <span style={{ opacity: 0.6 }}>{interimTranscript}</span>
                      )}
                    </div>

                    {transcript && (
                      <IonChip 
                        color="tertiary" 
                        style={{ marginTop: '1rem' }}
                      >
                        <IonLabel>
                          {transcript.split(' ').filter(word => word).length} words
                        </IonLabel>
                      </IonChip>
                    )}
                  </>
                )}
              </IonCardContent>
            </IonCard>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '1rem', 
              marginTop: '2rem' 
            }}>
              <IonButton
                size="large"
                color={isListening ? 'danger' : 'success'}
                onClick={toggleListening}
                disabled={!isSupported}
                className={isListening ? 'pulse-animation' : ''}
              >
                <IonIcon 
                  slot="start" 
                  icon={isListening ? micOffOutline : micOutline} 
                />
                {isListening ? 'Stop' : 'Start'} Recording
              </IonButton>

              {transcript && (
                <IonButton
                  size="large"
                  color="medium"
                  onClick={clearTranscript}
                >
                  <IonIcon slot="start" icon={refreshOutline} />
                  Clear
                </IonButton>
              )}
            </div>

            {/iPad|iPhone|iPod/.test(navigator.userAgent) && (
              <IonCard style={{ 
                marginTop: '2rem', 
                background: 'var(--dracula-current-line)',
                borderLeft: '4px solid var(--dracula-yellow)'
              }}>
                <IonCardContent>
                  <IonText color="medium">
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                      <strong>iOS Safari Tips:</strong><br/>
                      • Make sure you're using Safari (not Chrome on iOS)<br/>
                      • Allow microphone permissions when prompted<br/>
                      • Speak clearly and close to the device<br/>
                      • If recognition stops, tap Stop then Start again
                    </p>
                  </IonText>
                </IonCardContent>
              </IonCard>
            )}

          </div>
        </IonContent>

        <IonAlert
          isOpen={showPermissionAlert}
          onDidDismiss={() => setShowPermissionAlert(false)}
          header={'Microphone Permission Required'}
          message={'To use speech recognition, please allow microphone access. On iOS: Settings > Safari > Microphone > Allow'}
          buttons={['OK']}
        />

      </IonPage>
    </IonApp>
  )
}

export default App