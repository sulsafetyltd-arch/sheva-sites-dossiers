import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSafetyAuth } from '@/contexts/SafetyAuthContext';

export default function RequireSafetyAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useSafetyAuth();
  return isAdmin ? <>{children}</> : <Navigate to="/safety" replace />;
}
