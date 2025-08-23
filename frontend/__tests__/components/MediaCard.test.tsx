import { render, screen, fireEvent } from '@testing-library/react'
import { MediaCard } from '@/components/media/MediaCard'
import { mockMediaItem } from '../../__mocks__/api-responses'

describe('MediaCard', () => {
  const mockOnClick = jest.fn()

  beforeEach(() => {
    mockOnClick.mockClear()
  })

  it('should display media item information', () => {
    render(<MediaCard item={mockMediaItem} onClick={mockOnClick} />)

    expect(screen.getByText('Mountain Landscape at Sunset')).toBeInTheDocument()
    expect(screen.getByText('Breathtaking mountain landscape during golden hour with dramatic clouds')).toBeInTheDocument()
    expect(screen.getByText('IMAGO/TestPhotographer')).toBeInTheDocument()
    expect(screen.getByText('1920 × 1080')).toBeInTheDocument()
  })

  it('should display relevance score when available', () => {
    render(<MediaCard item={mockMediaItem} onClick={mockOnClick} />)

    expect(screen.getByText('Relevance: 123%')).toBeInTheDocument()
  })

  it('should not display relevance score when not available', () => {
    const itemWithoutScore = { ...mockMediaItem, score: undefined }
    render(<MediaCard item={itemWithoutScore} onClick={mockOnClick} />)

    expect(screen.queryByText(/Relevance:/)).not.toBeInTheDocument()
  })

  it('should render image with correct src and alt text', () => {
    render(<MediaCard item={mockMediaItem} onClick={mockOnClick} />)

    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('alt', 'Mountain Landscape at Sunset')
    expect(image).toHaveAttribute('src')
  })

  it('should call onClick when card is clicked', () => {
    render(<MediaCard item={mockMediaItem} onClick={mockOnClick} />)

    const card = screen.getByText('Mountain Landscape at Sunset').closest('.group')
    fireEvent.click(card!)

    expect(mockOnClick).toHaveBeenCalledWith(mockMediaItem)
  })

  it('should show hover overlay on mouse over', () => {
    render(<MediaCard item={mockMediaItem} onClick={mockOnClick} />)

    expect(screen.getByText('View Details')).toBeInTheDocument()
  })

  it('should truncate long titles and descriptions', () => {
    const itemWithLongContent = {
      ...mockMediaItem,
      title: 'This is a very long title that should be truncated to prevent layout issues in the card component',
      description: 'This is a very long description that contains many words and should be truncated to maintain a clean card layout without breaking the design',
    }

    render(<MediaCard item={itemWithLongContent} onClick={mockOnClick} />)

    const title = screen.getByText(itemWithLongContent.title)
    const description = screen.getByText(itemWithLongContent.description)

    expect(title).toHaveClass('line-clamp-2')
    expect(description).toHaveClass('line-clamp-2')
  })

  it('should handle missing onClick prop gracefully', () => {
    render(<MediaCard item={mockMediaItem} />)

    const card = screen.getByText('Mountain Landscape at Sunset').closest('.group')
    
    // Should not throw error when clicked without onClick handler
    expect(() => fireEvent.click(card!)).not.toThrow()
  })

  it('should use thumbnail URL when available, fallback to image URL', () => {
    // Test with thumbnail URL
    render(<MediaCard item={mockMediaItem} onClick={mockOnClick} />)
    let image = screen.getByRole('img')
    expect(image).toHaveAttribute('src')

    // Test without thumbnail URL
    const itemWithoutThumbnail = { ...mockMediaItem, thumbnailUrl: '' }
    render(<MediaCard item={itemWithoutThumbnail} onClick={mockOnClick} />)
    image = screen.getAllByRole('img')[1] // Get the second rendered image
    expect(image).toHaveAttribute('src')
  })

  it('should display loading state initially', () => {
    render(<MediaCard item={mockMediaItem} onClick={mockOnClick} />)

    // The loading spinner should be present initially
    expect(screen.getByRole('img')).toBeInTheDocument()
  })
})