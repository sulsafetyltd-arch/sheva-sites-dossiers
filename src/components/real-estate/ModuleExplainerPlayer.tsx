import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Gavel,
  Pause,
  Play,
  RefreshCw,
  Scale,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { TrainingModule } from '@/types/training';
import {
  buildExplainerSlides,
  explainerDurationLabel,
  type ExplainerSlide,
  type SlideVisual,
} from '@/lib/training-explainer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  module: TrainingModule;
  watched?: boolean;
  onWatched?: () => void;
}

function VisualScene({ type, caption }: { type: SlideVisual; caption: string }) {
  return (
    <div className={cn('explainer-visual', `explainer-visual--${type}`)} aria-hidden="true">
      <div className="explainer-visual-stage">
        {type === 'intro' && (
          <>
            <div className="ev-orb ev-orb-a" />
            <div className="ev-orb ev-orb-b" />
            <div className="ev-badge">סולו נדל״ן</div>
            <div className="ev-ring" />
          </>
        )}
        {type === 'law' && (
          <div className="ev-law-stack">
            {[0, 1, 2].map((i) => (
              <div key={i} className="ev-law-card" style={{ animationDelay: `${i * 0.14}s` }}>
                <Scale className="w-4 h-4 opacity-80" />
                <span />
              </div>
            ))}
          </div>
        )}
        {type === 'literature' && (
          <div className="ev-books">
            <div className="ev-book" />
            <div className="ev-book ev-book-mid" />
            <div className="ev-book" />
            <BookOpen className="ev-book-icon w-7 h-7" />
          </div>
        )}
        {type === 'cases' && (
          <div className="ev-cases">
            <Gavel className="ev-gavel w-10 h-10" />
            <div className="ev-case-lines">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        {type === 'deliverable' && (
          <div className="ev-practice">
            <div className="ev-doc">
              <FileText className="w-6 h-6 opacity-70" />
            </div>
            <div className="ev-pen" />
            <div className="ev-stamp">תוצר</div>
          </div>
        )}
        {type === 'exam' && (
          <div className="ev-quiz">
            <div className="ev-score-ring">
              <Trophy className="w-5 h-5" />
              <strong>ציון</strong>
            </div>
            <div className="ev-quiz-bars">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        {type === 'summary' && (
          <>
            <div className="ev-finish-burst" />
            <CheckCircle2 className="ev-finish-icon w-12 h-12" />
          </>
        )}
      </div>
      <p className="explainer-visual-caption">{caption}</p>
    </div>
  );
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
  const [revealed, setRevealed] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const durationRef = useRef(0);
  const cancelSpeechRef = useRef(false);
  const playGenRef = useRef(0);

  const slide: ExplainerSlide = slides[index] ?? slides[0];
  const durationLabel = explainerDurationLabel(slides);
  const speechSupported =
    typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';

  const stopSpeech = useCallback(() => {
    cancelSpeechRef.current = true;
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
    setRevealed(0);
    if (!slide?.bullets.length) return;
    const timers = slide.bullets.map((_, i) =>
      window.setTimeout(() => setRevealed((n) => Math.max(n, i + 1)), 220 + i * 380),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [slide?.id, index]);

  useEffect(() => {
    if (!playing) {
      stopSpeech();
      clearTimer();
      return;
    }

    const seconds = Math.max(10, slide.seconds);
    durationRef.current = seconds * 1000;
    startRef.current = Date.now();
    setSlideProgress(0);
    cancelSpeechRef.current = false;
    const gen = playGenRef.current + 1;
    playGenRef.current = gen;

    const speakNatural = () => {
      if (muted || !speechSupported) return;
      window.speechSynthesis.cancel();
      const voice = pickHebrewVoice(window.speechSynthesis.getVoices());
      const parts = splitNarration(slide.narration);
      if (!parts.length) return;

      let i = 0;
      const next = () => {
        if (cancelSpeechRef.current || playGenRef.current !== gen) return;
        if (i >= parts.length) return;
        const utter = new SpeechSynthesisUtterance(parts[i]);
        utter.lang = 'he-IL';
        utter.rate = 0.92;
        utter.pitch = 1.05;
        utter.volume = 1;
        if (voice) utter.voice = voice;
        utter.onend = () => {
          i += 1;
          window.setTimeout(next, 180);
        };
        utter.onerror = () => {
          i += 1;
          window.setTimeout(next, 60);
        };
        window.speechSynthesis.speak(utter);
      };
      next();
    };

    if (speechSupported) {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        const onVoices = () => {
          window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
          speakNatural();
        };
        window.speechSynthesis.addEventListener('voiceschanged', onVoices);
      } else {
        window.setTimeout(speakNatural, 120);
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
          <p className="text-sm font-semibold">שקופיות הסבר עם תמונות, הנפשות וקריינות</p>
          <p className="text-xs text-muted-foreground">
            {slides.length} שקפים · {durationLabel} · קריינות עברית בקצב דיבור טבעי
            {watched ? ' · נצפה' : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {speechSupported && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Volume2 className="w-3.5 h-3.5" />
              קריינות מוכנה
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

      <div className="relative bg-[hsl(176_45%_12%)] text-white min-h-[320px] md:min-h-[360px] grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
        <div className="absolute inset-0 opacity-35 pointer-events-none bg-[radial-gradient(ellipse_at_top,_hsl(176_80%_35%/_0.5),_transparent_55%)]" />
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[linear-gradient(135deg,transparent_40%,hsl(176_70%_40%/_0.25)_100%)]" />

        <div className="relative border-b md:border-b-0 md:border-l border-white/10 p-4 md:p-5 flex items-center justify-center">
          <VisualScene type={slide.visual} caption={slide.visualCaption} />
        </div>

        <div className="relative flex flex-col justify-center px-5 md:px-7 py-6 gap-3">
          <p className="text-[11px] uppercase tracking-wide text-white/60">
            שקף {index + 1} מתוך {slides.length}
          </p>
          <h3 className="text-xl md:text-2xl font-bold leading-snug animate-in fade-in slide-in-from-bottom-2 duration-500">
            {slide.title}
          </h3>
          <ul className="space-y-2 text-sm md:text-[15px] text-white/90 max-w-3xl">
            {slide.bullets.map((b, i) => (
              <li
                key={b}
                className={cn(
                  'flex gap-2 leading-relaxed transition-all duration-500',
                  i < revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
                )}
              >
                <span className="text-[hsl(176_80%_55%)] shrink-0">▸</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="px-4 pb-3 pt-2 bg-[hsl(176_45%_10%)] text-white">
        <p className="text-[12px] text-white/70 line-clamp-2 mb-2 leading-relaxed">{slide.narration}</p>
        <div className="h-1.5 rounded-full bg-white/15 overflow-hidden mb-3">
          <div
            className="h-full bg-[hsl(176_80%_45%)] transition-[width] duration-100 ease-linear"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            className={cn('text-white hover:bg-white/10', muted && 'opacity-60')}
            onClick={() => {
              setMuted((m) => !m);
              if (!muted) stopSpeech();
            }}
            title={muted ? 'הפעל קריינות' : 'השתק קריינות'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/10"
            onClick={() => goTo(0, false)}
            title="מההתחלה"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <span className="text-xs text-white/50 tabular-nums mr-auto">{overallPct}%</span>
        </div>
        <p className="text-[11px] text-white/45 mt-2">
          הקריינות מפצלת משפטים בקצב אנושי. בסיום המודול — מבחן ידע עם ציון מיידי.
        </p>
      </div>
    </section>
  );
}

export default ModuleExplainerPlayer;
