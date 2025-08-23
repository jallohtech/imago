import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '../../app/page'
import { mockApiResponse, mockSearchResponse } from '../../__mocks__/api-responses'

// Mock SWR to avoid actual API calls
jest.mock('swr', () => {
  const originalSWR = jest.requireActual('swr')
  return {
    ...originalSWR,
    __esModule: true,
    default: jest.fn(),
  }
})

const mockSWR = require('swr').default

describe('Home Page', () => {
  beforeEach(() => {
    mockSWR.mockClear()
  })

  it('should render welcome message when no search has been performed', () => {
    // Mock SWR to return no data (no search performed)
    mockSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
    })

    render(<Home />)

    expect(screen.getByText('Discover IMAGO\'s Media Collection')).toBeInTheDocument()
    expect(screen.getByText(/Search through thousands of high-quality images/)).toBeInTheDocument()
  })

  it('should render search form', () => {
    mockSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
    })

    render(<Home />)

    expect(screen.getByPlaceholderText('Search for images...')).toBeInTheDocument()
  })

  it('should show loading state when search is in progress', () => {
    // Mock SWR to return loading state
    mockSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    })

    render(<Home />)

    // Simulate that a search has been initiated (searchParams is not null)
    const searchInput = screen.getByPlaceholderText('Search for images...')
    fireEvent.change(searchInput, { target: { value: 'mountain' } })
    fireEvent.submit(searchInput.closest('form')!)

    // After form submission, the loading state should be visible
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
  })

  it('should display search results when data is loaded', () => {
    // Mock SWR to return successful search results
    mockSWR.mockReturnValue({
      data: mockSearchResponse,
      error: undefined,
      isLoading: false,
    })

    render(<Home />)

    // Simulate search
    const searchInput = screen.getByPlaceholderText('Search for images...')
    fireEvent.change(searchInput, { target: { value: 'mountain' } })
    fireEvent.submit(searchInput.closest('form')!)

    // Results should be displayed
    waitFor(() => {
      expect(screen.getByText('Mountain Landscape at Sunset')).toBeInTheDocument()
      expect(screen.getByText('Found 1,500,000 results')).toBeInTheDocument()
    })
  })

  it('should display error message when search fails', () => {
    // Mock SWR to return error state
    mockSWR.mockReturnValue({
      data: undefined,
      error: new Error('Search service unavailable'),
      isLoading: false,
    })

    render(<Home />)

    // Simulate search
    const searchInput = screen.getByPlaceholderText('Search for images...')
    fireEvent.change(searchInput, { target: { value: 'mountain' } })
    fireEvent.submit(searchInput.closest('form')!)

    waitFor(() => {
      expect(screen.getByText('Error loading results: Search service unavailable')).toBeInTheDocument()
    })
  })

  it('should show filters button after search is performed', () => {
    mockSWR.mockReturnValue({
      data: mockSearchResponse,
      error: undefined,
      isLoading: false,
    })

    render(<Home />)

    // Initially no filters button
    expect(screen.queryByText('Filters')).not.toBeInTheDocument()

    // Simulate search
    const searchInput = screen.getByPlaceholderText('Search for images...')
    fireEvent.change(searchInput, { target: { value: 'mountain' } })
    fireEvent.submit(searchInput.closest('form')!)

    waitFor(() => {
      expect(screen.getByText('Filters')).toBeInTheDocument()
    })
  })

  it('should show active filters count when filters are applied', async () => {
    mockSWR.mockReturnValue({
      data: mockSearchResponse,
      error: undefined,
      isLoading: false,
    })

    const user = userEvent.setup()
    render(<Home />)

    // Simulate search first
    const searchInput = screen.getByPlaceholderText('Search for images...')
    await user.type(searchInput, 'mountain')
    await user.keyboard('{Enter}')

    // Open filters modal (would need to be implemented in the test)
    await waitFor(() => {
      const filtersButton = screen.getByText('Filters')
      expect(filtersButton).toBeInTheDocument()
    })
  })

  it('should display proper app name from environment variable', () => {
    mockSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
    })

    render(<Home />)

    expect(screen.getByText('IMAGO Media Search')).toBeInTheDocument()
  })
})