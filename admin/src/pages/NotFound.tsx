import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

/** Shown for any address inside the admin that isn't a page — a mistyped URL or a removed link. */
export default function NotFound() {
  return (
    <Card>
      <EmptyState
        title="Page not found"
        description="That address doesn't match anything in the admin."
        action={
          <Link
            to="/"
            className="brand-gradient mt-2 inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-brand-on-primary shadow-sm hover:brightness-110"
          >
            Back to the dashboard
          </Link>
        }
      />
    </Card>
  );
}
