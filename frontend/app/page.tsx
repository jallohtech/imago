'use client';

import { useState } from 'react';
import { FunnelIcon } from '@heroicons/react/24/outline';
import { SearchForm } from '@/components/search/SearchForm';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchFilters } from '@/components/search/SearchFilters';
import { MediaModal } from '@/components/media/MediaModal';
import { Pagination } from '@/components/ui/Pagination';
import { useSearch } from '@/hooks/useSearch';
import { SearchParams, MediaItem } from '@/types/api.types';

const ITEMS_PER_PAGE = parseInt(process.env.NEXT_PUBLIC_ITEMS_PER_PAGE || '20');

export default function Home() {
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Partial<SearchParams>>({});
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  // Combine search params with filters and pagination
  const combinedParams = searchParams ? {
    ...searchParams,
    ...filters,
    size: ITEMS_PER_PAGE,
    from: (currentPage - 1) * ITEMS_PER_PAGE,
  } : null;

  const { data, error, isLoading } = useSearch(combinedParams);

  const handleSearch = (newParams: SearchParams) => {
    setSearchParams(newParams);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleFiltersChange = (newFilters: Partial<SearchParams>) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = data ? Math.ceil(data.total / ITEMS_PER_PAGE) : 0;
  const hasActiveFilters = Object.keys(filters).some(key => 
    filters[key as keyof SearchParams] !== undefined && 
    filters[key as keyof SearchParams] !== ''
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {process.env.NEXT_PUBLIC_APP_NAME || 'IMAGO Media Search'}
            </h1>
            
            {searchParams && (
              <button
                onClick={() => setShowFilters(true)}
                className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
              >
                <FunnelIcon className="w-4 h-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                    {Object.keys(filters).filter(key => 
                      filters[key as keyof SearchParams] !== undefined && 
                      filters[key as keyof SearchParams] !== ''
                    ).length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Form */}
        <div className="mb-8">
          <SearchForm onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {/* Search Results */}
        {searchParams && (
          <div className="space-y-6">
            <SearchResults
              results={data?.results || []}
              totalResults={data?.total || 0}
              isLoading={isLoading}
              error={error}
              onItemClick={setSelectedItem}
            />

            {/* Pagination */}
            {data && data.results && data.results.length > 0 && totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={data.total}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        )}

        {/* Welcome message when no search */}
        {!searchParams && (
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Discover IMAGO&apos;s Media Collection
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Search through thousands of high-quality images from IMAGO&apos;s extensive database. 
              Use the search bar above to get started.
            </p>
          </div>
        )}
      </main>

      {/* Modals */}
      <SearchFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      <MediaModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
      />
    </div>
  );
}
