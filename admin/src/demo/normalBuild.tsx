import type { ReactNode } from 'react';

/*
 * What a NORMAL build of the admin uses in place of the demo's UI and transport (vite.config.ts, resolve.alias).
 *
 * The layout, the sign-in page, main.tsx and lib/api.ts import the demo for their `if (IS_DEMO)` branches. Left alone, the
 * bundler still ships those modules (the hub client was in the shared chunk every admin page loads), so a sold copy's admin
 * would carry the demo's code. In a normal build these names resolve here instead. They are never called — `IS_DEMO` is false.
 *
 * Keep the signatures in step with the modules they stand in for: demo/adapter.ts, DemoGate.tsx, DemoBar.tsx, DemoLogins.tsx.
 */

// eslint-disable-next-line react/only-export-components -- one stub file for four modules, only some of them components
export const demoAdapter = async (): Promise<never> => {
  throw new Error('The live demo is not part of this build');
};
export const DemoGate = ({ children }: { children: ReactNode }) => <>{children}</>;
export const DemoBar: (props: { floating?: boolean }) => null = () => null;
export const DemoLogins: (props: { onUse: (email: string, password: string) => void; busy: boolean }) => null = () => null;
