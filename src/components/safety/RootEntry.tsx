import { useSearchParams } from 'react-router-dom';
import Index from '@/pages/Index';
import SafetyTradeRiskSign from '@/pages/safety-trade-risk/SafetyTradeRiskSign';
import RequireSafetyAuth from '@/components/safety/RequireSafetyAuth';

/**
 * Root entry supports public trade-risk signing via `/?tr=<token>`.
 * Query-param links always load `/` (index.html), which avoids Surge/PWA/WhatsApp
 * deep-link 404s that break path-based URLs like `/t/:token`.
 */
export default function RootEntry() {
  const [params] = useSearchParams();
  const token = params.get('tr')?.trim();
  if (token) {
    return <SafetyTradeRiskSign forcedToken={token} />;
  }
  return (
    <RequireSafetyAuth>
      <Index />
    </RequireSafetyAuth>
  );
}
