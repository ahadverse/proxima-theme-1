import type { ReactNode } from 'react';

/*
 * What a NORMAL build of the storefront uses in place of the demo's UI and hub client (next.config.ts, turbopack.resolveAlias).
 *
 * The pages and the layout import the demo for their `if (IS_DEMO)` branches. Left alone, the bundler still ships those modules:
 * a 'use client' module that a server file imports is sent to the browser whether or not the branch that renders it can run,
 * so every shopper of a sold copy would download the demo's tour, checklist and hub loader. In a normal build these names
 * resolve here instead, and nothing of the demo is in any page. They are never called — `IS_DEMO` is false.
 *
 * Keep the signatures in step with the modules they stand in for: src/demo/{DemoPage,DemoShell}.tsx, client/hub.ts,
 * ui/DemoPaymentHelp.tsx and ui/DemoPaymentPage.tsx.
 */

export const DemoPage: (props: { route: string }) => null = () => null;
export const DemoShell = ({ children }: { children: ReactNode }) => <>{children}</>;
export const DemoPaymentHelp: (props: { method: string }) => null = () => null;
export const DemoPaymentPage = () => null;

export async function demoRequest(): Promise<never> {
  throw new Error('The live demo is not part of this build');
}
