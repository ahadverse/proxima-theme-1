export interface RevenueSeriesPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  _id: string;
  title: string;
  images: { url: string; publicId?: string }[];
  purchaseCount: number;
  revenueTotal: number;
}

export interface DashboardSummary {
  revenue30d: number;
  orders30d: number;
  highRiskOrders30d: number;
  lowStockProducts: number;
  revenueTrendPct: number;
  ordersTrendPct: number;
  revenueSeries: RevenueSeriesPoint[];
  topProducts: TopProduct[];
}
