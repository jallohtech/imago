'use client';

import { useState, FormEvent } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { SearchParams } from '@/types/api.types';

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  isLoading?: boolean;
}

export function SearchForm({ onSearch, isLoading = false }: SearchFormProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch({ q: query.trim() });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for images..."
          className="w-full px-5 py-4 pr-12 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Search"
        >
          <MagnifyingGlassIcon className="w-6 h-6" />
        </button>
      </div>
    </form>
  );
}