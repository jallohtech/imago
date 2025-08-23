import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import { MediaItem } from '@/types/api.types';

export function useMediaItem(id: string | null) {
  const { data, error, isLoading } = useSWR<MediaItem>(
    id ? `/api/media/${id}` : null,
    () => apiClient.getMediaItem(id!),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    data,
    error,
    isLoading,
  };
}