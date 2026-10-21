export const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

function adminHeaders(extra = {}) {
  const token = localStorage.getItem('skynex-admin-token');
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

async function read(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.message || (response.status === 401
      ? 'Your administration session expired. Please sign in again.'
      : `Request failed (${response.status}).`);
    if (response.status === 401) {
      localStorage.removeItem('skynex-admin-token');
      localStorage.removeItem('skynex-admin-user');
      window.dispatchEvent(new CustomEvent('skynex:admin-session-expired'));
      if (window.location.pathname.startsWith('/skynex-control') &&
          !window.location.pathname.endsWith('/login')) {
        window.location.replace('/skynex-control/login?reason=expired');
      }
    }
    throw new Error(message);
  }
  return data;
}

export async function api(path, opts = {}) {
  const headers = {
    ...(opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(opts.headers || {}),
    ...adminHeaders()
  };
  let response;
  try { response = await fetch(`${API}${path}`, { ...opts, headers }); }
  catch {
    throw new Error(`Cannot reach the SkyNex API at ${API}. Check that the server is running and MongoDB is connected.`);
  }
  return read(response);
}

export async function uploadImages(files, area = 'products') {
  const fd = new FormData();
  [...files].forEach(file => fd.append('images', file));
  const response = await fetch(`${API}/upload?area=${encodeURIComponent(area)}`, {
    method: 'POST', body: fd, headers: adminHeaders()
  });
  return read(response);
}
