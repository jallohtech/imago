'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { SearchParams } from '@/types/api.types';

interface SearchFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: Partial<SearchParams>;
  onFiltersChange: (filters: Partial<SearchParams>) => void;
}

export function SearchFilters({ isOpen, onClose, filters, onFiltersChange }: SearchFiltersProps) {
  const handleFilterChange = (key: keyof SearchParams, value: string | number | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="w-full">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900 dark:text-white mb-4">
                      Search Filters
                    </Dialog.Title>

                    <div className="space-y-4">
                      {/* Database filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Database
                        </label>
                        <select
                          value={filters.database || ''}
                          onChange={(e) => handleFilterChange('database', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                        >
                          <option value="">All</option>
                          <option value="st">Stock (st)</option>
                          <option value="sp">Sport (sp)</option>
                        </select>
                      </div>

                      {/* Sort options */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Sort By
                        </label>
                        <select
                          value={filters.sortBy || 'relevance'}
                          onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                        >
                          <option value="relevance">Relevance</option>
                          <option value="date">Date</option>
                          <option value="width">Width</option>
                          <option value="height">Height</option>
                        </select>
                      </div>

                      {/* Sort order */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Sort Order
                        </label>
                        <select
                          value={filters.sortOrder || 'desc'}
                          onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                        >
                          <option value="desc">Descending</option>
                          <option value="asc">Ascending</option>
                        </select>
                      </div>

                      {/* Size dimensions */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Minimum Width (px)
                        </label>
                        <input
                          type="number"
                          value={filters.minWidth || ''}
                          onChange={(e) => handleFilterChange('minWidth', e.target.value ? parseInt(e.target.value) : undefined)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                          placeholder="e.g. 1920"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Minimum Height (px)
                        </label>
                        <input
                          type="number"
                          value={filters.minHeight || ''}
                          onChange={(e) => handleFilterChange('minHeight', e.target.value ? parseInt(e.target.value) : undefined)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                          placeholder="e.g. 1080"
                        />
                      </div>

                      {/* Photographer */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Photographer
                        </label>
                        <input
                          type="text"
                          value={filters.photographer || ''}
                          onChange={(e) => handleFilterChange('photographer', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                          placeholder="Enter photographer name"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-between">
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        Clear all filters
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}