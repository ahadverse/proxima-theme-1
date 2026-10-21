import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { useCustomers, type CustomerFilters } from '@/api/customers';
import { CustomerDetailModal } from './CustomerDetailModal';
import type { Customer } from '@/types/customer';

export default function Customers() {
  const [filters, setFilters] = useState<CustomerFilters>({ page: 1, limit: 20 });
  const { data, isLoading, isError, refetch } = useCustomers(filters);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const columns: Column<Customer>[] = [
    {
      header: 'Name',
      key: 'name',
      render: (c) => <span className="font-medium text-slate-800">{c.name}</span>,
    },
    { header: 'Phone', key: 'phone' },
    { header: 'Email', key: 'email', render: (c) => c.email || '—' },
    {
      header: 'Verified',
      key: 'isVerified',
      render: (c) => <Badge tone={c.isVerified ? 'green' : 'amber'}>{c.isVerified ? 'Verified' : 'Unverified'}</Badge>,
    },
    { header: 'Joined', key: 'createdAt', render: (c) => new Date(c.createdAt).toLocaleDateString() },
    {
      header: '',
      key: 'actions',
      className: 'text-right',
      render: (c) => (
        <div className="flex justify-end">
          <IconButton tone="blue" title="View details" onClick={() => setSelectedId(c._id)}>
            <Eye className="h-4 w-4" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Customers</h1>

      <Card>
        <div className="border-b border-slate-200 p-4">
          <Input aria-label="Search customers"
            placeholder="Search by name, phone, or email…"
            className="max-w-sm"
            value={filters.q ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value || undefined, page: 1 }))}
          />
        </div>

        <Table
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(c) => c._id}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          emptyTitle="No customers yet"
          emptyDescription="Shoppers who create an account will show up here."
        />

        {data?.meta && (
          <Pagination
            page={data.meta.page}
            pages={data.meta.pages}
            onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
          />
        )}
      </Card>

      <CustomerDetailModal customerId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
