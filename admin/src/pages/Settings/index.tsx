import { useCallback, useState, type ComponentType } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  CreditCard,
  Palette,
  PackageCheck,
  PanelBottom,
  Search,
  ShieldAlert,
  Store,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAdminSettings } from '@/api/settings';
import { cn } from '@/lib/cn';
import { AppearanceSection } from './AppearanceSection';
import { CourierSection } from './CourierSection';
import { DeliverySection } from './DeliverySection';
import { FooterSection } from './FooterSection';
import { FraudSection } from './FraudSection';
import { GeneralSection } from './GeneralSection';
import { PaymentsSection } from './PaymentsSection';
import { SeoSection } from './SeoSection';
import { TrackingSection } from './TrackingSection';
import type { SectionProps } from './useSettingsSection';

const TABS: { key: string; label: string; icon: LucideIcon; Section: ComponentType<SectionProps> }[] = [
  { key: 'general', label: 'General', icon: Store, Section: GeneralSection },
  { key: 'delivery', label: 'Delivery', icon: Truck, Section: DeliverySection },
  { key: 'payments', label: 'Payments', icon: CreditCard, Section: PaymentsSection },
  { key: 'courier', label: 'Courier', icon: PackageCheck, Section: CourierSection },
  { key: 'tracking', label: 'Tracking', icon: Activity, Section: TrackingSection },
  { key: 'fraud', label: 'Fraud', icon: ShieldAlert, Section: FraudSection },
  { key: 'appearance', label: 'Appearance', icon: Palette, Section: AppearanceSection },
  { key: 'footer', label: 'Footer', icon: PanelBottom, Section: FooterSection },
  { key: 'seo', label: 'SEO', icon: Search, Section: SeoSection },
];

export default function Settings() {
  const { data: settings, isLoading, isError, refetch } = useAdminSettings();
  const [params, setParams] = useSearchParams();
  const [dirtySections, setDirtySections] = useState<Record<string, boolean>>({});

  const activeKey = TABS.find((t) => t.key === params.get('tab'))?.key ?? TABS[0].key;

  const markDirty = useCallback((key: string, isDirty: boolean) => {
    setDirtySections((prev) => (prev[key] === isDirty ? prev : { ...prev, [key]: isDirty }));
  }, []);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Store configuration. Each tab is saved on its own — switching tabs keeps what you've typed.
        </p>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <nav
          aria-label="Settings sections"
          className="scrollbar-thin -mx-1 flex shrink-0 gap-1 overflow-x-auto px-1 pb-1 lg:sticky lg:top-0 lg:mx-0 lg:w-52 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
        >
          {TABS.map((tab) => {
            const isActive = tab.key === activeKey;
            return (
              <button
                key={tab.key}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setParams({ tab: tab.key }, { replace: true })}
                className={cn(
                  'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-800'
                )}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
                {dirtySections[tab.key] && (
                  <span
                    title="Unsaved changes"
                    className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1">
          {isLoading && (
            <div className="space-y-4 rounded-xl bg-slate-100 p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-2/3" />
            </div>
          )}
          {isError && !settings && (
            <ErrorState
              title="Couldn't load settings"
              description="Only super-admins can open this page. Check your connection and try again."
              onRetry={() => void refetch()}
            />
          )}
          {/* Every section stays mounted (hidden when inactive) so unsaved edits survive a tab switch. */}
          {settings &&
            TABS.map(({ key, Section }) => (
              <div key={key} hidden={key !== activeKey}>
                <Section settings={settings} onDirtyChange={markDirty} />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
