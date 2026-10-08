import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/** Shared so code outside React (toast actions) can refresh data. */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: true } },
  mutationCache: new MutationCache({
    onError: (error) => toast.error(error.message || 'Došlo je do greške.'),
  }),
});
