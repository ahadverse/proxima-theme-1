import { ListingSkeleton } from '@/components/product/ListingSkeleton';

// Shown while the listing's products load, so the page doesn't sit blank.
export default function Loading() {
  return <ListingSkeleton />;
}
