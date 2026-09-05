import type { ReactNode } from 'react';

/** Auth gate disabled at operator request — app opens without login screen. */
export default function RequireSafetyAuth({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
