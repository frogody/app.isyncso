import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '@/App.jsx'
import '@/index.css'
import ErrorBoundary from '@/components/error/ErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,    // 5 min — data stays fresh across page navigation
      gcTime: 15 * 60_000,     // 15 min — cache kept in memory
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,   // don't refetch if data is still fresh
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
)