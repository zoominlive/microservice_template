import { QueryClient } from '@tanstack/react-query';
import { getAuthToken } from './auth-utils';

// Create a single query client instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        const token = getAuthToken();
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          if (response.status === 401) {
            // Token expired or invalid
            window.dispatchEvent(new CustomEvent('authExpired'));
          }
          throw new Error(`API call failed: ${response.statusText}`);
        }
        
        return response.json();
      },
    },
  },
});

// Helper function for mutations
export async function apiRequest(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  data?: any
) {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('authExpired'));
    }
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API call failed: ${response.statusText}`);
  }
  
  // Handle empty responses
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}