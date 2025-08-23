import { render, screen } from '@testing-library/react'
import { SearchResults } from '@/components/search/SearchResults'
import { mockMediaItem } from '../../__mocks__/api-responses'

describe('SearchResults', () => {
  const mockOnItemClick = jest.fn()

  beforeEach(() => {
    mockOnItemClick.mockClear()
  })

  it('should display loading spinner when loading', () => {
    render(
      <SearchResults
        results={[]}
        totalResults={0}
        isLoading={true}
        onItemClick={mockOnItemClick}
      />
    )

    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
  })

  it('should display error message when there is an error', () => {
    const error = new Error('Failed to fetch search results')
    render(
      <SearchResults
        results={[]}
        totalResults={0}
        isLoading={false}
        error={error}
        onItemClick={mockOnItemClick}
      />
    )

    expect(screen.getByText('Error loading results: Failed to fetch search results')).toBeInTheDocument()
  })

  it('should display no results message when results array is empty', () => {
    render(
      <SearchResults
        results={[]}
        totalResults={0}
        isLoading={false}
        onItemClick={mockOnItemClick}
      />
    )

    expect(screen.getByText('No results found. Try a different search term.')).toBeInTheDocument()
  })

  it('should display results count', () => {
    render(
      <SearchResults
        results={[mockMediaItem]}
        totalResults={1500000}
        isLoading={false}
        onItemClick={mockOnItemClick}
      />
    )

    expect(screen.getByText('Found 1,500,000 results')).toBeInTheDocument()
  })

  it('should render media cards for each result', () => {
    const multipleItems = [
      mockMediaItem,
      { ...mockMediaItem, id: '123456789', title: 'Another Mountain Scene' },
      { ...mockMediaItem, id: '987654321', title: 'Third Mountain Image' },
    ]

    render(
      <SearchResults
        results={multipleItems}
        totalResults={3}
        isLoading={false}
        onItemClick={mockOnItemClick}
      />
    )

    expect(screen.getByText('Mountain Landscape at Sunset')).toBeInTheDocument()
    expect(screen.getByText('Another Mountain Scene')).toBeInTheDocument()
    expect(screen.getByText('Third Mountain Image')).toBeInTheDocument()
  })

  it('should use responsive grid layout', () => {
    render(
      <SearchResults
        results={[mockMediaItem]}
        totalResults={1}
        isLoading={false}
        onItemClick={mockOnItemClick}
      />
    )

    const grid = screen.getByText('Mountain Landscape at Sunset').closest('.grid')
    expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4')
  })

  it('should handle large result counts with proper formatting', () => {
    render(
      <SearchResults
        results={[mockMediaItem]}
        totalResults={1234567}
        isLoading={false}
        onItemClick={mockOnItemClick}
      />
    )

    expect(screen.getByText('Found 1,234,567 results')).toBeInTheDocument()
  })

  it('should not render results section when loading', () => {
    render(
      <SearchResults
        results={[]}
        totalResults={0}
        isLoading={true}
        onItemClick={mockOnItemClick}
      />
    )

    expect(screen.queryByText(/Found.*results/)).not.toBeInTheDocument()
  })

  it('should not render results section when there is an error', () => {
    const error = new Error('Network error')
    render(
      <SearchResults
        results={[]}
        totalResults={0}
        isLoading={false}
        error={error}
        onItemClick={mockOnItemClick}
      />
    )

    expect(screen.queryByText(/Found.*results/)).not.toBeInTheDocument()
  })
})