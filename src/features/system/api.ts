import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../lib/api/client';

type Ready = { data: { status: string; database: string } };

export function useApiReadiness() {
  return useQuery({
    queryKey: ['system', 'ready'],
    queryFn: ({ signal }) => apiGet<Ready>('/health/ready', signal),
    retry: false,
  });
}
