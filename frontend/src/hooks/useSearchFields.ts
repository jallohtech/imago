import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import { SearchFieldsResponse } from '@/types/api.types';

export function useSearchFields() {
  const { data, error, isLoading } = useSWR<SearchFieldsResponse>(
    '/api/search/fields',
    () => apiClient.getSearchableFields(),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
    }
  );

  return {
    data,
    error,
    isLoading,
  };
}