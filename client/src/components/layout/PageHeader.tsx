import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  backTo?: string;
}

export function PageHeader({ title, subtitle, actions, backTo }: PageHeaderProps) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        {backTo && (
          <Button asChild variant="ghost" size="icon" className="-ml-2 shrink-0" aria-label="Natrag">
            <Link to={backTo}>
              <ArrowLeft />
            </Link>
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
