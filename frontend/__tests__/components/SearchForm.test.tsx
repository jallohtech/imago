import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchForm } from '@/components/search/SearchForm'
import { SearchParams } from '@/types/api.types'

describe('SearchForm', () => {
  const mockOnSearch = jest.fn()

  beforeEach(() => {
    mockOnSearch.mockClear()
  })

  it('should render search input with placeholder', () => {
    render(<SearchForm onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText('Search for images...')
    expect(input).toBeInTheDocument()
  })

  it('should submit search with query when form is submitted', async () => {
    const user = userEvent.setup()
    render(<SearchForm onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText('Search for images...')
    const submitButton = screen.getByLabelText('Search')

    await user.type(input, 'mountain landscape')
    await user.click(submitButton)

    expect(mockOnSearch).toHaveBeenCalledWith({
      q: 'mountain landscape',
    })
  })

  it('should submit search when Enter key is pressed', async () => {
    const user = userEvent.setup()
    render(<SearchForm onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText('Search for images...')
    await user.type(input, 'nature photography')
    await user.keyboard('{Enter}')

    expect(mockOnSearch).toHaveBeenCalledWith({
      q: 'nature photography',
    })
  })

  it('should trim whitespace from search query', async () => {
    const user = userEvent.setup()
    render(<SearchForm onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText('Search for images...')
    await user.type(input, '  mountain   ')

    fireEvent.submit(input.closest('form')!)

    expect(mockOnSearch).toHaveBeenCalledWith({
      q: 'mountain',
    })
  })

  it('should not submit empty or whitespace-only queries', async () => {
    const user = userEvent.setup()
    render(<SearchForm onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText('Search for images...')
    const submitButton = screen.getByLabelText('Search')

    // Try empty query
    await user.click(submitButton)
    expect(mockOnSearch).not.toHaveBeenCalled()

    // Try whitespace-only query
    await user.type(input, '   ')
    await user.click(submitButton)
    expect(mockOnSearch).not.toHaveBeenCalled()
  })

  it('should disable input and button when loading', () => {
    render(<SearchForm onSearch={mockOnSearch} isLoading={true} />)

    const input = screen.getByPlaceholderText('Search for images...')
    const submitButton = screen.getByLabelText('Search')

    expect(input).toBeDisabled()
    expect(submitButton).toBeDisabled()
  })

  it('should update input value as user types', async () => {
    const user = userEvent.setup()
    render(<SearchForm onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText('Search for images...') as HTMLInputElement
    
    await user.type(input, 'sunset')

    expect(input.value).toBe('sunset')
  })

  it('should enable submit button only when query has content', async () => {
    const user = userEvent.setup()
    render(<SearchForm onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText('Search for images...')
    const submitButton = screen.getByLabelText('Search')

    // Initially disabled (empty)
    expect(submitButton).toBeDisabled()

    // Enabled when typing
    await user.type(input, 'test')
    expect(submitButton).not.toBeDisabled()

    // Disabled again when cleared
    await user.clear(input)
    expect(submitButton).toBeDisabled()
  })
})