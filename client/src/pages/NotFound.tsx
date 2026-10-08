import { Ghost as GhostIcon } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/common/States';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <EmptyState
      icon={GhostIcon}
      title="Stranica nije pronađena"
      description="Ovdje nema ničega, čak ni duhova."
      action={
        <Button asChild>
          <Link to="/">Povratak na početnu</Link>
        </Button>
      }
    />
  );
}
