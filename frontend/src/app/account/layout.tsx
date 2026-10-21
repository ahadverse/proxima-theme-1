import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/AccountShell';

export const metadata: Metadata = { title: 'My Account', robots: { index: false } };

export default function AccountLayout({ children }: LayoutProps<'/account'>) {
  return <AccountShell>{children}</AccountShell>;
}
