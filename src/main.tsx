import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import AuthGate from './components/AuthGate';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: true,
      staleTime: 30_000,
    },
  },
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <AuthGate>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </AuthGate>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
