import { useState, useCallback, useRef, useEffect } from 'react';

// Extend Window for SpeechRecognition
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useSpeechToText() {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => !!getSpeechRecognition());
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const callbackRef = useRef<((text: string) => void) | null>(null);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const start = useCallback((onResult: (text: string) => void) => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    // Stop any existing session
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SR();
    recognition.lang = 'he-IL';
    recognition.continuous = true;
    recognition.interimResults = false;

    callbackRef.current = onResult;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          transcript += e.results[i][0].transcript;
        }
      }
      if (transcript && callbackRef.current) {
        callbackRef.current(transcript);
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      console.warn('Speech recognition error:', e.error);
      if (e.error !== 'no-speech') {
        stop();
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return { start, stop, isListening, isSupported };
}
