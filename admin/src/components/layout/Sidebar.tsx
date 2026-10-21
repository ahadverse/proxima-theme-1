import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronsLeft, ChevronsRight, Zap } from 'lucide-react';
import { navSections, type NavItem, type NavTone } from './navConfig';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';

const toneChip: Record<NavTone, string> = {
  blue: 'bg-blue-500/15 text-blue-300',
  emerald: 'bg-emerald-500/15 text-emerald-300',
  amber: 'bg-amber-500/15 text-amber-300',
  violet: 'bg-violet-500/15 text-violet-300',
  rose: 'bg-rose-500/15 text-rose-300',
  cyan: 'bg-cyan-500/15 text-cyan-300',
};
const toneChipActive: Record<NavTone, string> = {
  blue: 'bg-blue-500/25 text-blue-200',
  emerald: 'bg-emerald-500/25 text-emerald-200',
  amber: 'bg-amber-500/25 text-amber-200',
  violet: 'bg-violet-500/25 text-violet-200',
  rose: 'bg-rose-500/25 text-rose-200',
  cyan: 'bg-cyan-500/25 text-cyan-200',
};

function NavItemRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const [isHovered, setIsHovered] = useState(false);
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number } | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  // The flyout is portaled to <body> (see render below) because the sidebar's own scroll
  // container (overflow-y-auto on <nav>, overflow-hidden on the collapsing rail) would
  // otherwise clip anything positioned outside its box — a plain absolute child never shows.
  function handleMouseEnter() {
    const rect = rowRef.current?.getBoundingClientRect();
    if (rect) setFlyoutPos({ top: rect.top + rect.height / 2, left: rect.right + 8 });
    setIsHovered(true);
  }

  return (
    <div ref={rowRef} className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={() => setIsHovered(false)}>
      <NavLink
        to={item.to}
        end={item.to === '/'}
        className={({ isActive }) =>
          cn(
            'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            collapsed && 'justify-center px-0',
            isActive
              ? 'bg-white/10 text-white'
              : 'text-brand-text-on-dark/90 hover:bg-white/5 hover:text-white'
          )
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={cn(
                'absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand-accent transition-opacity',
                isActive && !collapsed ? 'opacity-100' : 'opacity-0'
              )}
            />
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
                isActive ? toneChipActive[item.tone] : toneChip[item.tone]
              )}
            >
              <item.icon className="h-4 w-4" />
            </span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </>
        )}
      </NavLink>

      {collapsed &&
        createPortal(
          <AnimatePresence>
            {isHovered && flyoutPos && (
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: 0.12 }}
                style={{ position: 'fixed', top: flyoutPos.top, left: flyoutPos.left, transform: 'translateY(-50%)' }}
                className="z-50 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-lg"
              >
                {item.label}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}

function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const toggleCollapsed = useUiStore((s) => s.toggleSidebarCollapsed);
  const isSuperAdmin = useAuthStore((s) => s.admin?.role === 'super-admin');

  const sections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isSuperAdmin || !item.superAdminOnly),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      <div
        className={cn(
          'flex h-16 items-center gap-2.5 border-b border-white/10',
          collapsed ? 'justify-center px-2' : 'px-6'
        )}
      >
        <div className="brand-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-brand-on-primary shadow-sm">
          <Zap className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="text-lg font-bold text-brand-text-on-dark">Maroon</p>
            <p className="text-[11px] text-brand-text-muted">Admin</p>
          </div>
        )}
      </div>

      <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {sections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItemRow key={item.to} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <button
        type="button"
        onClick={toggleCollapsed}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={cn(
          'hidden items-center gap-2 border-t border-white/10 px-3 py-3 text-sm text-brand-text-on-dark/80 transition-colors hover:bg-white/5 hover:text-white lg:flex',
          collapsed ? 'justify-center' : 'justify-start'
        )}
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        {!collapsed && 'Collapse'}
      </button>
    </>
  );
}

export function Sidebar() {
  const isOpen = useUiStore((s) => s.isSidebarOpen);
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  const isCollapsed = useUiStore((s) => s.isSidebarCollapsed);
  const location = useLocation();

  // Close the mobile drawer whenever navigation happens (e.g. tapping a nav link).
  useEffect(() => {
    closeSidebar();
  }, [location.pathname, closeSidebar]);

  return (
    <>
      <motion.aside
        animate={{ width: isCollapsed ? 72 : 256 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-brand-bg-dark text-brand-text-on-dark lg:flex"
      >
        <SidebarContent collapsed={isCollapsed} />
      </motion.aside>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSidebar}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-bg-dark text-brand-text-on-dark lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.2 }}
            >
              <SidebarContent collapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
