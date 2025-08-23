'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ArrowDownTrayIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { MediaItem } from '@/types/api.types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MediaItem | null;
}

export function MediaModal({ isOpen, onClose, item }: MediaModalProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  if (!item) return null;

  const handleDownload = () => {
    window.open(item.imageUrl, '_blank');
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
          <div className="fixed inset-0 bg-black bg-opacity-90" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-900 shadow-xl transition-all max-w-7xl w-full">
                {/* Header */}
                <div className="absolute top-0 right-0 p-4 z-10 flex gap-2">
                  <button
                    onClick={() => setShowInfo(!showInfo)}
                    className="rounded-full bg-black bg-opacity-50 p-2 text-white hover:bg-opacity-70 transition"
                  >
                    <InformationCircleIcon className="h-6 w-6" />
                  </button>
                  <button
                    onClick={handleDownload}
                    className="rounded-full bg-black bg-opacity-50 p-2 text-white hover:bg-opacity-70 transition"
                  >
                    <ArrowDownTrayIcon className="h-6 w-6" />
                  </button>
                  <button
                    onClick={onClose}
                    className="rounded-full bg-black bg-opacity-50 p-2 text-white hover:bg-opacity-70 transition"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Image */}
                <div className="relative bg-black" style={{ maxHeight: '80vh' }}>
                  {imageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <LoadingSpinner />
                    </div>
                  )}
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    width={item.width}
                    height={item.height}
                    className="w-full h-full object-contain"
                    style={{ maxHeight: '80vh' }}
                    onLoad={() => setImageLoading(false)}
                    priority
                  />
                </div>

                {/* Info Panel */}
                <Transition
                  show={showInfo}
                  enter="transition ease-out duration-200"
                  enterFrom="transform opacity-0 translate-y-full"
                  enterTo="transform opacity-100 translate-y-0"
                  leave="transition ease-in duration-150"
                  leaveFrom="transform opacity-100 translate-y-0"
                  leaveTo="transform opacity-0 translate-y-full"
                >
                  <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 p-6 border-t dark:border-gray-800">
                    <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                      {item.title}
                    </h2>
                    
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      {item.description}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">ID:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{item.bildnummer}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Photographer:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{item.photographer}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Dimensions:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{item.width} × {item.height}px</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Database:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{item.database.toUpperCase()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Date:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {new Date(item.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Orientation:</span>
                        <p className="font-medium text-gray-900 dark:text-white capitalize">{item.orientation}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Language:</span>
                        <p className="font-medium text-gray-900 dark:text-white uppercase">{item.language}</p>
                      </div>
                      {item.score && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Relevance:</span>
                          <p className="font-medium text-gray-900 dark:text-white">{(item.score * 100).toFixed(0)}%</p>
                        </div>
                      )}
                    </div>

                    {item.cleanedText && item.cleanedText !== item.searchText && (
                      <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Original search text (cleaned):</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{item.cleanedText}</p>
                      </div>
                    )}
                  </div>
                </Transition>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}