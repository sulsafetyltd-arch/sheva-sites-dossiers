import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { useCallback } from 'react';

interface Props {
  onTranscript: (text: string) => void;
  currentValue: string;
}

const VoiceNoteButton = ({ onTranscript, currentValue }: Props) => {
  const { start, stop, isListening, isSupported } = useSpeechToText();

  const handleToggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start((text) => {
        const separator = currentValue && !currentValue.endsWith(' ') ? ' ' : '';
        onTranscript(currentValue + separator + text);
      });
    }
  }, [isListening, start, stop, onTranscript, currentValue]);

  if (!isSupported) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={isListening ? 'destructive' : 'ghost'}
            size="icon"
            className={`w-7 h-7 shrink-0 ${isListening ? 'animate-pulse' : ''}`}
            onClick={handleToggle}
          >
            {isListening ? (
              <MicOff className="w-3.5 h-3.5" />
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {isListening ? 'עצור הקלטה' : 'הערת קול — דבר בעברית'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default VoiceNoteButton;
