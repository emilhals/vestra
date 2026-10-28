import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage.tsx'

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <HomePage />
    </QueryClientProvider>,
  )
}

describe('HomePage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows the backend version when the API responds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ name: 'Vestra', version: '1.2.3', serverTime: '' })),
      ),
    )
    renderPage()
    expect(await screen.findByText(/version 1\.2\.3/)).toBeInTheDocument()
  })

  it('shows an error when the API is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))
    renderPage()
    expect(await screen.findByText('Backend unreachable')).toBeInTheDocument()
  })
})
