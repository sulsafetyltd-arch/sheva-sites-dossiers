import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { TrainingModule } from '@/types/training';
import {
  buildExplainerSlides,
  explainerDurationLabel,
  type ExplainerSlide,
} from '@/lib/training-explainer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  module: TrainingModule;
  watched?: boolean;
  onWatched?: () => void;
}

function pickHebrewVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const hebrew = voices.filter(
    (v) => v.lang.toLowerCase().startsWith('he') || /hebrew|ivrit|עברית/i.test(v.name),
  );
  if (!hebrew.length) return null;
  return (
    hebrew.find((v) =>
      /carmel|noa|hila|google|premium|enhanced|natural|neural/i.test(`${v.name} ${v.lang}`),
    ) ?? hebrew[0]
  );
}

function splitNarration(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|(?<=[.!?])(?=[א-תA-Za-z״"'])/)
    .map((p) => p.trim())
    .filter((p) => p.length > 1);
}

export function ModuleExplainerPlayer({ module, watched, onWatched }: Props) {
  const slides = useMemo(() => buildExplainerSlides(module), [module]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0);
  const [voiceReady, setVoiceReady] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const durationRef = useRef(0);
  const playGenRef = useRef(0);
  const advancedRef = useRef(false);

  const slide: ExplainerSlide = slides[index] ?? slides[0];
  const durationLabel = explainerDurationLabel(slides);
  const speechSupported =
    typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';

  const stopSpeech = useCallback(() => {
    playGenRef.current += 1;
    if (speechSupported) window.speechSynthesis.cancel();
  }, [speechSupported]);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const goTo = useCallback(
    (nextIndex: number, autoplay: boolean) => {
      stopSpeech();
      clearTimer();
      advancedRef.current = false;
      setSlideProgress(0);
      setIndex(Math.max(0, Math.min(slides.length - 1, nextIndex)));
      setPlaying(autoplay);
    },
    [clearTimer, slides.length, stopSpeech],
  );

  const finishExplainer = useCallback(() => {
    setPlaying(false);
    setSlideProgress(100);
    stopSpeech();
    clearTimer();
    onWatched?.();
  }, [clearTimer, onWatched, stopSpeech]);

  const advance = useCallback(() => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    if (index >= slides.length - 1) {
      finishExplainer();
      return;
    }
    goTo(index + 1, true);
  }, [finishExplainer, goTo, index, slides.length]);

  useEffect(() => {
    if (!speechSupported) return;
    const sync = () => setVoiceReady(window.speechSynthesis.getVoices().length > 0);
    sync();
    window.speechSynthesis.addEventListener('voiceschanged', sync);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', sync);
  }, [speechSupported]);

  useEffect(() => {
    if (!playing) {
      stopSpeech();
      clearTimer();
      return;
    }

    advancedRef.current = false;
    const seconds = Math.max(10, slide.seconds);
    // When narrating, allow speech to finish; timer is a safety net (1.6× slide length)
    const useSpeech = speechSupported && !muted;
    durationRef.current = (useSpeech ? seconds * 1.6 : seconds) * 1000;
    startRef.current = Date.now();
    setSlideProgress(0);

    const gen = playGenRef.current + 1;
    playGenRef.current = gen;

    const speakNatural = () => {
      if (!useSpeech) return;
      window.speechSynthesis.cancel();
      const voice = pickHebrewVoice(window.speechSynthesis.getVoices());
      const parts = splitNarration(slide.narration);
      if (!parts.length) {
        advance();
        return;
      }

      let i = 0;
      const next = () => {
        if (playGenRef.current !== gen) return;
        if (i >= parts.length) {
          clearTimer();
          window.setTimeout(() => {
            if (playGenRef.current === gen) advance();
          }, 220);
          return;
        }
        const utter = new SpeechSynthesisUtterance(parts[i]);
        utter.lang = 'he-IL';
        utter.rate = 0.92;
        utter.pitch = 1.05;
        utter.volume = 1;
        if (voice) utter.voice = voice;
        utter.onend = () => {
          i += 1;
          window.setTimeout(next, 160);
        };
        utter.onerror = () => {
          i += 1;
          window.setTimeout(next, 60);
        };
        window.speechSynthesis.speak(utter);
      };
      next();
    };

    if (useSpeech) {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        const onVoices = () => {
          window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
          if (playGenRef.current === gen) speakNatural();
        };
        window.speechSynthesis.addEventListener('voiceschanged', onVoices);
        // Fallback if voices never fire
        window.setTimeout(() => {
          if (playGenRef.current === gen) speakNatural();
        }, 400);
      } else {
        window.setTimeout(speakNatural, 100);
      }
    }

    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(100, (elapsed / durationRef.current) * 100);
      setSlideProgress(pct);
      if (elapsed >= durationRef.current) {
        clearTimer();
        advance();
      }
    }, 100);

    return () => {
      clearTimer();
      stopSpeech();
    };
  }, [advance, clearTimer, muted, playing, slide, speechSupported, stopSpeech]);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
    setSlideProgress(0);
    stopSpeech();
    clearTimer();
  }, [module.id, clearTimer, stopSpeech]);

  const overallPct = Math.round(((index + slideProgress / 100) / slides.length) * 100);

  return (
    <section className="re-card overflow-hidden border-primary/20" aria-label="שקופיות הסבר עם קריינות">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b bg-muted/30">
        <div>
          <p className="text-sm font-semibold">שקופיות הסבר עם קריינות</p>
          <p className="text-xs text-muted-foreground">
            {slides.length} שקפים · {durationLabel} · מעבר שקף בסיום הדיבור
            {watched ? ' · נצפה' : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {speechSupported && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Volume2 className="w-3.5 h-3.5" />
              {voiceReady ? 'קריינות מוכנה' : muted ? 'מושתק' : 'טוען קול…'}
            </span>
          )}
          {watched && (
            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              הושלם צפייה
            </span>
          )}
        </div>
      </div>

      <div className="relative bg-[hsl(176_45%_12%)] text-white min-h-[280px] md:min-h-[320px] flex flex-col">
        <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(ellipse_at_top,_hsl(176_80%_35%/_0.45),_transparent_55%)]" />

        <div className="relative flex-1 flex flex-col justify-center px-5 md:px-8 py-6 gap-4">
          <p className="text-[11px] uppercase tracking-wide text-white/60">
            שקף {index + 1} מתוך {slides.length}
          </p>
          <h3 className="text-xl md:text-2xl font-bold leading-snug">{slide.title}</h3>
          <ul className="space-y-2 text-sm md:text-[15px] text-white/90 max-w-3xl">
            {slide.bullets.map((b) => (
              <li key={b} className="flex gap-2 leading-relaxed">
                <span className="text-[hsl(176_80%_55%)] shrink-0">▸</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative px-4 pb-3 pt-1">
          <p className="text-[12px] text-white/70 line-clamp-2 mb-2 leading-relaxed" aria-live="polite">
            {slide.narration}
          </p>
          <div className="h-1.5 rounded-full bg-white/15 overflow-hidden mb-3">
            <div
              className="h-full bg-[hsl(176_80%_45%)] transition-[width] duration-100 ease-linear"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5 bg-white text-[hsl(176_45%_12%)] hover:bg-white/90"
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {playing ? 'השהה' : index === 0 && slideProgress === 0 ? 'הפעל הסבר מקריין' : 'המשך קריינות'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => goTo(index - 1, playing)}
              disabled={index === 0}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => {
                if (index >= slides.length - 1) finishExplainer();
                else goTo(index + 1, playing);
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={cn('text-white hover:bg-white/10 mr-auto', muted && 'opacity-60')}
              onClick={() => {
                setMuted((m) => !m);
                if (!muted) stopSpeech();
              }}
              title={muted ? 'הפעל קריינות' : 'השתק קריינות'}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <span className="text-xs text-white/50 tabular-nums">{overallPct}%</span>
          </div>
          <p className="text-[11px] text-white/45 mt-2">
            הקריינות מפצלת משפטים וממתינה לסיום הדיבור לפני מעבר שקף (עם גיבוי טיימר).
          </p>
        </div>
      </div>
    </section>
  );
}

export default ModuleExplainerPlayer;
