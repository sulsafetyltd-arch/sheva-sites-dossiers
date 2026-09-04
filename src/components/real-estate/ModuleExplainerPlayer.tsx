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
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith('he')) ??
    voices.find((v) => /hebrew|ivrit|עברית/i.test(v.name)) ??
    null
  );
}

export function ModuleExplainerPlayer({ module, watched, onWatched }: Props) {
  const slides = useMemo(() => buildExplainerSlides(module), [module]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const speakingRef = useRef(false);

  const slide: ExplainerSlide = slides[index] ?? slides[0];
  const durationLabel = explainerDurationLabel(slides);

  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    speakingRef.current = false;
  }, []);

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
    if (index >= slides.length - 1) {
      finishExplainer();
      return;
    }
    goTo(index + 1, true);
  }, [finishExplainer, goTo, index, slides.length]);

  useEffect(() => {
    if (!playing) {
      stopSpeech();
      clearTimer();
      return;
    }

    const seconds = Math.max(8, slide.seconds);
    durationRef.current = seconds * 1000;
    startRef.current = Date.now();
    setSlideProgress(0);

    const speak = () => {
      if (muted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      stopSpeech();
      const utter = new SpeechSynthesisUtterance(slide.narration);
      utter.lang = 'he-IL';
      utter.rate = 1.02;
      const voice = pickHebrewVoice(window.speechSynthesis.getVoices());
      if (voice) utter.voice = voice;
      utter.onend = () => {
        speakingRef.current = false;
      };
      speakingRef.current = true;
      window.speechSynthesis.speak(utter);
    };

    // Voices often load async
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => speak();
      } else {
        speak();
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
  }, [advance, clearTimer, muted, playing, slide, stopSpeech]);

  // Reset when module changes
  useEffect(() => {
    setIndex(0);
    setPlaying(false);
    setSlideProgress(0);
    stopSpeech();
    clearTimer();
  }, [module.id, clearTimer, stopSpeech]);

  const overallPct = Math.round(((index + slideProgress / 100) / slides.length) * 100);

  return (
    <section className="re-card overflow-hidden border-primary/20">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b bg-muted/30">
        <div>
          <p className="text-sm font-semibold">סרטון הסבר למודול</p>
          <p className="text-xs text-muted-foreground">
            {slides.length} שקפים · {durationLabel}
            {watched ? ' · נצפה' : ''}
          </p>
        </div>
        {watched && (
          <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            הושלם צפייה
          </span>
        )}
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
          <p className="text-[12px] text-white/70 line-clamp-2 mb-2 leading-relaxed">
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
              {playing ? 'השהה' : index === 0 && slideProgress === 0 ? 'נגן הסבר' : 'המשך'}
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
        </div>
      </div>
    </section>
  );
}

export default ModuleExplainerPlayer;
