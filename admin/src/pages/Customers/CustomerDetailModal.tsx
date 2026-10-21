import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Table, type Column } from '@/components/ui/Table';
import { useCustomer } from '@/api/customers';
import type { CustomerOrderSummary } from '@/types/customer';

export function CustomerDetailModal({ customerId, onClose }: { customerId: string | null; onClose: () => void }) {
  const { data: customer, isLoading, refetch } = useCustomer(customerId ?? undefined);

  const columns: Column<CustomerOrderSummary>[] = [
    { header: 'Order', key: 'orderNumber' },
    { header: 'Total', key: 'total', render: (o) => `৳${o.pricing.grandTotal.toLocaleString()}` },
    { header: 'Status', key: 'orderStatus', render: (o) => <Badge tone="slate">{o.orderStatus}</Badge> },
    { header: 'Placed', key: 'createdAt', render: (o) => new Date(o.createdAt).toLocaleDateString() },
  ];

  return (
    <Modal
      isOpen={Boolean(customerId)}
      onClose={onClose}
      title={customer ? customer.name : 'Customer'}
      widthClassName="max-w-xl"
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !customer ? (
        <ErrorState compact title="Couldn't load this customer" onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-400">Phone</p>
              <p className="text-slate-700">{customer.phone}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Email</p>
              <p className="text-slate-700">{customer.email || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Joined</p>
              <p className="text-slate-700">{new Date(customer.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Account</p>
              <div className="flex gap-1.5">
                <Badge tone={customer.isVerified ? 'green' : 'amber'}>
                  {customer.isVerified ? 'Verified' : 'Unverified'}
                </Badge>
                <Badge tone={customer.isActive ? 'green' : 'red'}>{customer.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
            </div>
          </div>

          {customer.addresses.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Addresses</p>
              <div className="space-y-2">
                {customer.addresses.map((a) => (
                  <div key={a._id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
                    <span className="font-medium text-slate-700">{a.label}</span> — {a.fullAddress}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Orders</p>
            <Table
              columns={columns}
              rows={customer.orders}
              rowKey={(o) => o._id}
              emptyTitle="No orders yet"
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
