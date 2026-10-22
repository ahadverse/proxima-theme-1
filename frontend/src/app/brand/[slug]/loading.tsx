import { ListingSkeleton } from '@/components/product/ListingSkeleton';

// Shown while the brand's products load, so the page doesn't sit blank. (A brand page has no filter sidebar.)
export default function Loading() {
  return <ListingSkeleton withFilters={false} />;
}
