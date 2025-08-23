'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  // Generate page numbers to show
  const getPageNumbers = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const pages = [];
    
    if (totalPages <= 7) {
      // Show all pages if there are 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show the first page
      pages.push(1);
      
      if (currentPage > delta + 2) {
        pages.push('...');
      }
      
      // Pages around the current page
      const start = Math.max(2, currentPage - delta);
      const end = Math.min(totalPages - 1, currentPage + delta);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - delta - 1) {
        pages.push('...');
      }
      
      // Always show the last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          className={clsx(
            'relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium',
            canGoPrevious
              ? 'text-gray-700 hover:bg-gray-50'
              : 'text-gray-400 cursor-not-allowed',
            'dark:bg-gray-800 dark:border-gray-600 dark:text-white'
          )}
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className={clsx(
            'relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium',
            canGoNext
              ? 'text-gray-700 hover:bg-gray-50'
              : 'text-gray-400 cursor-not-allowed',
            'dark:bg-gray-800 dark:border-gray-600 dark:text-white'
          )}
        >
          Next
        </button>
      </div>
      
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalItems.toLocaleString()}</span> results
          </p>
        </div>
        
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            {/* Previous button */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!canGoPrevious}
              className={clsx(
                'relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0',
                !canGoPrevious && 'cursor-not-allowed opacity-50',
                'dark:ring-gray-600 dark:hover:bg-gray-700'
              )}
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            
            {/* Page numbers */}
            {getPageNumbers().map((page, index) => {
              if (page === '...') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0 dark:text-gray-300 dark:ring-gray-600"
                  >
                    ...
                  </span>
                );
              }
              
              const isCurrentPage = page === currentPage;
              
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page as number)}
                  className={clsx(
                    'relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset focus:z-20 focus:outline-offset-0',
                    isCurrentPage
                      ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                      : 'text-gray-900 ring-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-700'
                  )}
                >
                  {page}
                </button>
              );
            })}
            
            {/* Next button */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!canGoNext}
              className={clsx(
                'relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0',
                !canGoNext && 'cursor-not-allowed opacity-50',
                'dark:ring-gray-600 dark:hover:bg-gray-700'
              )}
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}