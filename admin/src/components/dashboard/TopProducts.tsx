import type { TopProduct } from '@/types/dashboard';

export function TopProducts({ products }: { products: TopProduct[] }) {
  if (products.length === 0) {
    return <p className="px-5 py-10 text-center text-sm text-slate-400">No sales yet.</p>;
  }

  const maxCount = Math.max(...products.map((p) => p.purchaseCount), 1);

  return (
    <div className="divide-y divide-slate-200">
      {products.map((p, i) => (
        <div key={p._id} className="flex items-center gap-3 px-5 py-3">
          <span className="w-4 text-center text-xs font-semibold text-slate-400">{i + 1}</span>
          {p.images[0] && (
            <img src={p.images[0].url} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-700">{p.title}</p>
            <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200">
              <div
                className="h-1.5 rounded-full bg-brand-ink"
                style={{ width: `${(p.purchaseCount / maxCount) * 100}%` }}
              />
            </div>
          </div>
          <div className="shrink-0 text-right text-xs">
            <p className="font-semibold text-slate-700">{p.purchaseCount} sold</p>
            <p className="text-slate-400">৳{p.revenueTotal.toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
