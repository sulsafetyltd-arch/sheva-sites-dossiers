import type { ReactNode } from 'react';

/** Admin gate disabled together with login screen. */
export default function RequireSafetyAdmin({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
