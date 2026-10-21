import {
  LayoutDashboard,
  BarChart3,
  Package,
  Boxes,
  FolderTree,
  Tag,
  SlidersHorizontal,
  ShoppingCart,
  ClipboardList,
  Users,
  Star,
  TicketPercent,
  Image,
  Newspaper,
  HelpCircle,
  FileText,
  Settings,
  UserCog,
  type LucideIcon,
} from 'lucide-react';

export type NavTone = 'blue' | 'emerald' | 'amber' | 'violet' | 'rose' | 'cyan';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  tone: NavTone;
  /** Hidden from staff accounts — the API refuses them too. */
  superAdminOnly?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard, tone: 'blue' },
      { label: 'Analytics', to: '/analytics', icon: BarChart3, tone: 'violet' },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { label: 'Products', to: '/products', icon: Package, tone: 'blue' },
      { label: 'Inventory', to: '/inventory', icon: Boxes, tone: 'amber' },
      { label: 'Categories', to: '/categories', icon: FolderTree, tone: 'emerald' },
      { label: 'Brands', to: '/brands', icon: Tag, tone: 'cyan' },
      { label: 'Attributes', to: '/attributes', icon: SlidersHorizontal, tone: 'violet' },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Orders', to: '/orders', icon: ShoppingCart, tone: 'blue' },
      { label: 'Incomplete Orders', to: '/incomplete-orders', icon: ClipboardList, tone: 'amber' },
      { label: 'Customers', to: '/customers', icon: Users, tone: 'emerald' },
      { label: 'Reviews', to: '/reviews', icon: Star, tone: 'rose' },
      { label: 'Coupons', to: '/coupons', icon: TicketPercent, tone: 'violet' },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Banners', to: '/banners', icon: Image, tone: 'cyan' },
      { label: 'Blog', to: '/blog', icon: Newspaper, tone: 'blue' },
      { label: 'FAQ', to: '/faq', icon: HelpCircle, tone: 'emerald' },
      { label: 'Static Pages', to: '/pages', icon: FileText, tone: 'amber' },
    ],
  },
  {
    title: 'Store',
    items: [
      { label: 'Settings', to: '/settings', icon: Settings, tone: 'violet', superAdminOnly: true },
      { label: 'Staff', to: '/staff', icon: UserCog, tone: 'rose', superAdminOnly: true },
    ],
  },
];
