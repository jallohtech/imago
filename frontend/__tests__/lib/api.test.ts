import { apiClient } from '@/lib/api'
import { mockApiResponse, mockSearchResponse, mockMediaItem, mockErrorResponse } from '../../__mocks__/api-responses'

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('ApiClient', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('search', () => {
    it('should format search parameters correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse(mockSearchResponse)),
      } as Response)

      await apiClient.search({
        q: 'mountain landscape',
        size: 20,
        minWidth: 1920,
        sortBy: 'relevance',
        database: 'st',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/search?q=mountain+landscape&size=20&minWidth=1920&sortBy=relevance&database=st',
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    })

    it('should handle empty and undefined parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse(mockSearchResponse)),
      } as Response)

      await apiClient.search({
        q: 'test',
        size: undefined,
        minWidth: null as any,
        photographer: '',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/search?q=test',
        expect.any(Object)
      )
    })

    it('should parse successful responses correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse(mockSearchResponse)),
      } as Response)

      const result = await apiClient.search({ q: 'mountain' })

      expect(result).toEqual(mockSearchResponse)
      expect(result.results[0].cleanedText).toBe('Berg Landschaft Sonnenuntergang Natur')
      expect(result.warnings).toContain('1 of 20 results had encoding issues that were automatically corrected')
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockErrorResponse('Elasticsearch connection failed', 503)),
      } as Response)

      await expect(apiClient.search({ q: 'test' })).rejects.toThrow('Elasticsearch connection failed')
    })

    it('should handle network failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(apiClient.search({ q: 'test' })).rejects.toThrow('Network error')
    })

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      await expect(apiClient.search({ q: 'test' })).rejects.toThrow('HTTP error! status: 500')
    })
  })

  describe('getMediaItem', () => {
    it('should fetch media item by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse(mockMediaItem)),
      } as Response)

      const result = await apiClient.getMediaItem('258999077')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/media/258999077',
        expect.any(Object)
      )
      expect(result).toEqual(mockMediaItem)
    })

    it('should handle media item not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockErrorResponse('Media item not found', 404)),
      } as Response)

      await expect(apiClient.getMediaItem('nonexistent')).rejects.toThrow('Media item not found')
    })
  })

  describe('validateImageUrls', () => {
    it('should validate multiple URLs', async () => {
      const mockValidationResponse = {
        'https://example.com/image1.jpg': { isValid: true },
        'https://example.com/image2.jpg': { isValid: false, errors: ['404 Not Found'] },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse(mockValidationResponse)),
      } as Response)

      const result = await apiClient.validateImageUrls([
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ])

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/media/validate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            urls: [
              'https://example.com/image1.jpg',
              'https://example.com/image2.jpg',
            ],
          }),
        }
      )
      expect(result).toEqual(mockValidationResponse)
    })
  })
})