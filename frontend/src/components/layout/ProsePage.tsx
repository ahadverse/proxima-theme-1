import { Breadcrumb } from './Breadcrumb';
import type { ReactNode } from 'react';

export function ProsePage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
      <Breadcrumb items={[{ label: title }]} />
      <h1 className="mb-6 text-2xl font-bold text-white md:text-3xl">{title}</h1>
      <div className="space-y-4 rounded-xl border border-slate-100 bg-white p-6 text-sm leading-relaxed text-slate-600">
        {children}
      </div>
    </div>
  );
}
