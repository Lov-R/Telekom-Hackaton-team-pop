import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { MORE_ITEMS } from '@/components/layout/nav';

/** relAI-UX "Više": everything that is not Mapa, Zadaci or Avatar. */
export default function More() {
  return (
    <>
      <h1 className="hero-title mb-6">
        Sve ostalo.
        <span>Na dohvat ruke.</span>
      </h1>
      <ul className="space-y-3">
        {MORE_ITEMS.map(({ to, label, description, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl border bg-secondary text-primary">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold">{label}</span>
                <span className="block truncate text-sm text-muted-foreground">{description}</span>
              </span>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
