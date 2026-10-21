export const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

function authHeaders() {
  const token = localStorage.getItem('skynex-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.message || (response.status === 401
      ? 'Your session has expired. Please sign in again.'
      : `Request failed (${response.status}).`);
    if (response.status === 401) {
      // Never touch the separate admin session from a customer request.
      localStorage.removeItem('skynex-token');
      localStorage.removeItem('skynex-user');
      window.dispatchEvent(new CustomEvent('skynex:customer-session-expired'));
    }
    throw new Error(message);
  }
  return data;
}

export async function api(path, options = {}) {
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
    ...authHeaders()
  };
  let response;
  try {
    response = await fetch(`${API}${path}`, { ...options, headers });
  } catch {
    throw new Error(`Cannot reach the SkyNex API at ${API}. Start the server on port 5000 and check your .env settings.`);
  }
  return readResponse(response);
}

export async function uploadImages(files, area = 'products') {
  const formData = new FormData();
  [...files].forEach(file => formData.append('images', file));
  const response = await fetch(`${API}/upload?area=${encodeURIComponent(area)}`, {
    method: 'POST', body: formData, headers: authHeaders()
  });
  return readResponse(response);
}

export async function uploadProfileImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  return readResponse(await fetch(`${API}/users/me/profile-image`, {
    method: 'POST', body: formData, headers: authHeaders()
  }));
}

export async function removeProfileImage() {
  return api('/users/me/profile-image', { method: 'DELETE' });
}

export function assetUrl(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return API.replace(/\/api\/?$/, '') + (value.startsWith('/') ? value : `/${value}`);
}
