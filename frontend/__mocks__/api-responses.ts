import { ApiResponse, MediaItem, SearchResponse, SearchFieldsResponse } from '@/types/api.types'

export const mockMediaItem: MediaItem = {
  id: '258999077',
  bildnummer: '258999077',
  title: 'Mountain Landscape at Sunset', // Generated title
  description: 'Breathtaking mountain landscape during golden hour with dramatic clouds',
  searchText: 'Berg ? Landschaft ? Sonnenuntergang ? Natur', // Original with encoding issues
  photographer: 'IMAGO/TestPhotographer',
  date: '2023-08-15T10:30:00.000Z',
  width: 1920,
  height: 1080,
  database: 'st',
  imageUrl: 'https://www.imago-images.de/bild/st/0258999077/s.jpg',
  thumbnailUrl: 'https://www.imago-images.de/bild/st/0258999077/s.jpg',
  score: 1.2345,
  aspectRatio: 1.777,
  orientation: 'landscape' as const,
  language: 'de',
  cleanedText: 'Berg Landschaft Sonnenuntergang Natur', // Cleaned text
  fileSize: 2048576,
  mimeType: 'image/jpeg',
  imageValidation: {
    isValid: true,
    statusCode: 200,
    errors: [],
  },
}

export const mockSearchResponse: SearchResponse = {
  results: [mockMediaItem],
  total: 1500000,
  page: 1,
  pageSize: 20,
  facets: {
    photographer: [
      { key: 'IMAGO/TestPhotographer', doc_count: 500 },
      { key: 'IMAGO/AnotherPhotographer', doc_count: 300 },
    ],
    database: [
      { key: 'st', doc_count: 1200000 },
      { key: 'sp', doc_count: 300000 },
    ],
  },
  suggestions: ['mountain landscape', 'mountain sunset', 'nature photography'],
  warnings: ['1 of 20 results had encoding issues that were automatically corrected'],
}

export const mockSearchFieldsResponse: SearchFieldsResponse = {
  searchableFields: ['title', 'description', 'searchText', 'photographer'],
  stats: {
    totalDocuments: 1500000,
    indexSize: '50GB',
    fieldCoverage: {
      title: { present: 1200000, missing: 300000, coverage: 80 },
      description: { present: 1400000, missing: 100000, coverage: 93 },
      photographer: { present: 1500000, missing: 0, coverage: 100 },
    },
  },
  facets: {
    database: [
      { key: 'st', doc_count: 1200000 },
      { key: 'sp', doc_count: 300000 },
    ],
  },
  languages: [
    { key: 'de', doc_count: 800000 },
    { key: 'en', doc_count: 600000 },
    { key: 'mixed', doc_count: 100000 },
  ],
}

export const mockApiResponse = <T>(data: T): ApiResponse<T> => ({
  success: true,
  data,
  timestamp: '2023-12-25T10:30:00.000Z',
  metadata: {
    pagination: {
      total: 1500000,
      returned: 20,
      page: 1,
      pageSize: 20,
      totalPages: 75000,
      hasNext: true,
      hasPrevious: false,
    },
    timing: {
      took: 45,
    },
  },
})

export const mockErrorResponse = (message: string, statusCode: number = 500): ApiResponse<never> => ({
  success: false,
  error: message,
  statusCode,
  timestamp: '2023-12-25T10:30:00.000Z',
})