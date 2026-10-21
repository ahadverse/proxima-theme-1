import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { apiErrorMessage } from '@/lib/api';
import { ThemedToaster } from '@/components/layout/ThemedToaster';
import App from './App.tsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // TanStack's default (3 retries with 1s/2s/4s backoff) keeps a dead request on a spinner for
      // ~7s before anything is said. One quick retry covers a blip; a 4xx (bad request, forbidden,
      // not found) will never fix itself, so those fail straight away.
      retry: (failureCount, error) => {
        if (axios.isAxiosError(error) && error.response && error.response.status < 500) return false;
        return failureCount < 1;
      },
      retryDelay: 700,
    },
  },
  // A page that fails to load should say so — not leave the admin guessing at a spinner. Only the
  // first (nothing-to-show) failure of a query toasts; background refetches that fail while old
  // data is still on screen stay quiet. One shared id means a dead backend shows one toast, not
  // one per query, and a 401 is handled by the session interceptor (it goes to the login screen).
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.state.data !== undefined) return;
      if (axios.isAxiosError(error) && error.response?.status === 401) return;
      toast.error(apiErrorMessage(error, "Couldn't load data — check your connection"), {
        id: 'query-error',
      });
    },
  }),
  // No websockets — instead, any successful action anywhere refreshes the dashboard
  // numbers and the notification bell, so the UI still feels live.
  mutationCache: new MutationCache({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  }),
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <ThemedToaster />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
