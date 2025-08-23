'use client';

import { MediaItem } from '@/types/api.types';
import { MediaCard } from '@/components/media/MediaCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface SearchResultsProps {
  results: MediaItem[];
  totalResults: number;
  isLoading: boolean;
  error?: Error;
  onItemClick?: (item: MediaItem) => void;
}

export function SearchResults({ 
  results, 
  totalResults, 
  isLoading, 
  error,
  onItemClick 
}: SearchResultsProps) {
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">
          Error loading results: {error.message}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">
          No results found. Try a different search term.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Found {totalResults.toLocaleString()} results
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {results.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            onClick={onItemClick}
          />
        ))}
      </div>
    </div>
  );
}