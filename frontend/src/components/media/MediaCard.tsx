'use client';

import Image from 'next/image';
import { MediaItem } from '@/types/api.types';
import { useState } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface MediaCardProps {
  item: MediaItem;
  onClick?: (item: MediaItem) => void;
}

export function MediaCard({ item, onClick }: MediaCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleClick = () => {
    if (onClick) {
      onClick(item);
    }
  };

  return (
    <div
      className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-shadow duration-300"
      onClick={handleClick}
    >
      <div className="aspect-w-16 aspect-h-12 relative bg-gray-100 dark:bg-gray-700">
        {!imageError ? (
          <>
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pulse">
                  <PhotoIcon className="w-12 h-12 text-gray-400" />
                </div>
              </div>
            )}
            <Image
              src={item.thumbnailUrl || item.imageUrl}
              alt={item.title}
              fill
              className={clsx(
                'object-cover transition-opacity duration-300',
                imageLoading ? 'opacity-0' : 'opacity-100'
              )}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              onError={() => setImageError(true)}
              onLoad={() => setImageLoading(false)}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
            <PhotoIcon className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="text-white font-medium">View Details</span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1">
          {item.title}
        </h3>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
          {item.description}
        </p>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
          <span>{item.photographer}</span>
          <span>{item.width} × {item.height}</span>
        </div>

        {item.score && (
          <div className="mt-2 text-xs text-gray-500">
            Relevance: {(item.score * 100).toFixed(0)}%
          </div>
        )}
      </div>
    </div>
  );
}