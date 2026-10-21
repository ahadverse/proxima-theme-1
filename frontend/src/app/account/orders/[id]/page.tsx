import { OrderDetailClient } from '@/components/order/OrderDetailClient';

// Per-customer order data with no static params list — never worth prerendering.
export const instant = false;

export default async function AccountOrderDetailPage(props: PageProps<'/account/orders/[id]'>) {
  const { id } = await props.params;
  return <OrderDetailClient id={id} />;
}
