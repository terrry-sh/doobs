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
  const recognitionRef = useRef<any>(null)

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
      setIsListening(false)
      
      if (event.error === 'no-speech') {
        console.log('No speech detected. Try again.')
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const toggleListening = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
      setInterimTranscript('')
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const clearTranscript = () => {
    setTranscript('')
    setInterimTranscript('')
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
                      Please use Chrome, Edge, or Safari.
                    </p>
                  </IonText>
                ) : (
                  <>
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

          </div>
        </IonContent>
      </IonPage>
    </IonApp>
  )
}

export default App