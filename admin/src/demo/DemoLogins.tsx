import { useEffect, useState } from 'react';
import { Crown, LogIn, UserRound } from 'lucide-react';
import { demoRequest } from './hub';

interface Login {
  email: string;
  password: string;
  name: string;
}

/**
 * The demo's documented sign-ins, on the sign-in page: the store owner, and a staff member to show what staff can't do
 * (Settings and Staff are the owner's). Read from the visitor's copy, so a renamed account shows its new email.
 */
export function DemoLogins({ onUse, busy }: { onUse: (email: string, password: string) => void; busy: boolean }) {
  const [logins, setLogins] = useState<{ owner: Login | null; staff: Login | null } | null>(null);

  useEffect(() => {
    void demoRequest('GET', '/__demo/status').then((reply) => {
      if (reply.status === 200) setLogins((reply.body as { data: { logins: { owner: Login | null; staff: Login | null } } }).data.logins);
    });
  }, []);

  if (!logins) return null;
  const options = [
    { login: logins.owner, role: 'Store owner', note: 'Everything, including Settings and Staff', icon: Crown },
    { login: logins.staff, role: 'Staff member', note: 'Day-to-day work — no Settings or Staff', icon: UserRound },
  ].filter((o): o is typeof o & { login: Login } => Boolean(o.login));

  return (
    <div className="mt-8 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
      <p className="text-xs font-bold tracking-wider text-amber-500 uppercase">Demo sign-in</p>
      <p className="mt-1 text-xs text-slate-500">Pick an account — the password for both is shown.</p>
      <div className="mt-3 space-y-2">
        {options.map(({ login, role, note, icon: Icon }) => (
          <button
            key={login.email}
            type="button"
            disabled={busy}
            onClick={() => onUse(login.email, login.password)}
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-left transition-colors hover:border-amber-400 disabled:opacity-60"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-500">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900">{role}</span>
              <span className="block truncate text-xs text-slate-500">
                {login.email} · {login.password}
              </span>
              <span className="block text-[11px] text-slate-400">{note}</span>
            </span>
            <LogIn className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
