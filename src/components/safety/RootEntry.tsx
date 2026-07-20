import { useSearchParams } from 'react-router-dom';
import Index from '@/pages/Index';
import SafetyTradeRiskSign from '@/pages/safety-trade-risk/SafetyTradeRiskSign';
import SafetyInductionSign from '@/pages/safety-induction/SafetyInductionSign';
import RequireSafetyAuth from '@/components/safety/RequireSafetyAuth';

/**
 * Root entry supports public signing via query-param deep links:
 * - `/?tr=<token>` trade-risk acknowledgment
 * - `/?ci=<token>` construction induction acknowledgment
 *
 * Query-param links always load `/` (index.html), which avoids Surge/PWA/WhatsApp
 * deep-link 404s that break path-based URLs.
 */
export default function RootEntry() {
  const [params] = useSearchParams();
  const tradeToken = params.get('tr')?.trim();
  if (tradeToken) {
    return <SafetyTradeRiskSign forcedToken={tradeToken} />;
  }
  const inductionToken = params.get('ci')?.trim();
  if (inductionToken) {
    return <SafetyInductionSign forcedToken={inductionToken} />;
  }
  return (
    <RequireSafetyAuth>
      <Index />
    </RequireSafetyAuth>
  );
}
