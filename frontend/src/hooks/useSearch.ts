import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import { SearchParams, SearchResponse } from '@/types/api.types';

function buildSearchKey(params: SearchParams | null) {
  if (!params || !params.q) return null;
  
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString());
    }
  });
  
  return `/api/search?${searchParams.toString()}`;
}

export function useSearch(params: SearchParams | null) {
  const key = buildSearchKey(params);
  
  const { data, error, isLoading, mutate } = useSWR<SearchResponse>(
    key,
    () => apiClient.search(params!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    }
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}