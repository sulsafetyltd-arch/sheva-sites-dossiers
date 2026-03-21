import { Wifi, WifiOff, Cloud } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

const OfflineSyncIndicator = () => {
  const { isOnline, pendingSyncs } = useOnlineStatus();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-default">
            {isOnline ? (
              <Badge variant="outline" className="gap-1 text-xs py-0.5 px-2 text-emerald-600 border-emerald-200 bg-emerald-50">
                <Wifi className="w-3 h-3" />
                מחובר
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-xs py-0.5 px-2 text-amber-600 border-amber-200 bg-amber-50">
                <WifiOff className="w-3 h-3" />
                לא מחובר
                {pendingSyncs > 0 && (
                  <span className="mr-1 tabular-nums">({pendingSyncs})</span>
                )}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isOnline
            ? 'מחובר לרשת — השינויים נשמרים'
            : `עובד במצב לא מקוון${pendingSyncs > 0 ? ` — ${pendingSyncs} שינויים ממתינים לסנכרון` : ''}`
          }
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default OfflineSyncIndicator;
