export interface AnalyticsTotals {
  revenue: number;
  orders: number;
  units: number;
  averageOrderValue: number;
}

export interface SalesPoint {
  /** YYYY-MM-DD in the store's timezone. */
  date: string;
  revenue: number;
  orders: number;
  units: number;
}

export interface AnalyticsOverview {
  days: number;
  timezone: string;
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  totals: AnalyticsTotals;
  previous: AnalyticsTotals;
  series: SalesPoint[];
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface ProductPerformanceRow {
  id: string;
  title: string;
  image: string | null;
  units: number;
  revenue: number;
  orders: number;
  views: number;
  addToCarts: number;
  /** null for a product that has since been deleted. */
  stockStatus: StockStatus | null;
}

export interface ProductPerformance {
  days: number;
  from: string;
  to: string;
  top: ProductPerformanceRow[];
  worst: ProductPerformanceRow[];
}

export interface CategoryRow {
  id: string | null;
  name: string;
  slug: string | null;
  units: number;
  revenue: number;
  /** Fraction of product sales, 0–1. */
  share: number;
}

export interface CategoryBreakdown {
  days: number;
  from: string;
  to: string;
  total: number;
  categories: CategoryRow[];
}

export interface FunnelStep {
  key: 'browsed' | 'carted' | 'purchased';
  label: string;
  visitors: number;
}

export interface Funnel {
  days: number;
  from: string;
  to: string;
  steps: FunnelStep[];
  /** Visitors who ordered ÷ visitors who browsed; null when nobody browsed. */
  conversionRate: number | null;
  events: { views: number; addToCarts: number; purchases: number };
}
