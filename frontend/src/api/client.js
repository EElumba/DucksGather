// Centralized API client wrapper
// Uses fetch with proxy (package.json "proxy"), attaches Authorization header if token present.
// Optional debug logging when REACT_APP_DEBUG_API is set.

const DEBUG_API = !!process.env.REACT_APP_DEBUG_API;
const API_ORIGIN = process.env.REACT_APP_API_ORIGIN || 'http://127.0.0.1:5000';

export function getAuthToken() {
  return localStorage.getItem('dg_token') || null; // Supabase access token stored after login
}

async function request(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const finalHeaders = { 'Content-Type': 'application/json', ...headers };
  const token = getAuthToken();
  if (auth && token) {
    finalHeaders['Authorization'] = `Bearer ${token}`;
  }
  const url = path.startsWith('http') ? path : `${API_ORIGIN}${path}`;
  if (DEBUG_API) {
    // eslint-disable-next-line no-console
    console.log('[api] request', { path, resolved: url, method, auth, hasToken: !!token, headers: finalHeaders });
  }
  const resp = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  const isJson = resp.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await resp.json() : await resp.text();
  if (DEBUG_API) {
    // eslint-disable-next-line no-console
    console.log('[api] response', { originalPath: path, finalUrl: resp.url, status: resp.status, statusText: resp.statusText, data });
  }
  if (!resp.ok) {
    const message = typeof data === 'object' && data?.error ? data.error : resp.statusText;
    const err = new Error(message);
    err.status = resp.status;
    err.data = data;
    err.url = resp.url;
    throw err;
  }
  return data;
}

// Users
export async function fetchCurrentUser() {
  return request('/api/users/me');
}

// Events
export async function listEvents({ page = 1, page_size = 20, category, from, to, q } = {}) {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('page_size', page_size);
  if (category) params.set('category', category);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (q) params.set('q', q);
  return request(`/api/events/?${params.toString()}`, { auth: false }); // public list
}

// Fetch a single event by ID (public detail view)
export async function getEvent(id) {
  return request(`/api/events/${id}`, { auth: false });
}

export async function createEvent(payload) {
  return request('/api/events/', { method: 'POST', body: payload });
}

export async function updateEvent(id, patch) {
  return request(`/api/events/${id}`, { method: 'PATCH', body: patch });
}

export async function saveEvent(id) {
  return request(`/api/events/${id}/save`, { method: 'POST' });
}

export async function unsaveEvent(id) {
  return request(`/api/events/${id}/save`, { method: 'DELETE' });
}

export async function listSavedEvents() {
  return request('/api/events/saved');
}

// Auth convenience
export function setAuthToken(token) {
  localStorage.setItem('dg_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('dg_token');
}

export async function searchBuildings(q) {
  // Use centralized request helper; building search is public
  return request(`/api/events/buildings?q=${encodeURIComponent(q)}`, { auth: false });
}
