// Unified frontend API client for Vercel/Neon backend

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const isDev = import.meta.env.DEV;
  // In dev, assuming Vite proxies /api to the API server or we just hit it relatively
  // When running locally, Vite's proxy or direct `/api` is used.
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (options.body instanceof FormData) {
    // Let the browser set Content-Type for FormData (multipart/form-data with boundary)
    delete (headers as any)['Content-Type'];
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin', // Always send the httpOnly session cookie
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      // Unauthorized - session might be expired
      // AuthContext will handle state, but we could trigger an event here
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}

export const api = {
  get: (url: string) => fetchWithAuth(url, { method: 'GET' }),
  post: (url: string, body?: any) => fetchWithAuth(url, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body)
  }),
  put: (url: string, body?: any) => fetchWithAuth(url, {
    method: 'PUT',
    body: body instanceof FormData ? body : JSON.stringify(body)
  }),
  del: (url: string) => fetchWithAuth(url, { method: 'DELETE' })
};
