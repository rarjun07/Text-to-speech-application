const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function getErrorMessage(body, fallback) {
  const detail = typeof body === 'object' && body !== null ? body.detail : body;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') return item.msg || item.message || JSON.stringify(item);
      return String(item);
    }).join(' ');
  }
  if (detail && typeof detail === 'object') return detail.message || detail.error || JSON.stringify(detail);
  return fallback;
}

async function requestJson(path, options = {}) {
  let response;

  try {
    const headers = {
      Accept: 'application/json',
      ...options.headers,
    };
    if (options.body) headers['Content-Type'] = 'application/json';

    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new ApiError('The backend could not be reached.', 0, error);
  }

  const contentType = response.headers.get('content-type') || '';
  if (response.status === 204) return null;
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new ApiError(getErrorMessage(body, `Request failed with status ${response.status}.`), response.status, body);
  }

  return body;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getHealth() {
  return requestJson('/api/health');
}

export function getVoices() {
  return requestJson('/api/voices');
}

export function generateSpeech({ text, language, voice, speakingRate, pitch, volumeGainDb, token }) {
  return requestJson('/api/tts', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify({
      text,
      language,
      voice,
      speaking_rate: speakingRate,
      pitch,
      volume_gain_db: volumeGainDb,
    }),
  });
}

export function registerAccount({ fullName, mobileNumber, email, password }) {
  return requestJson('/api/auth/register', { method: 'POST', body: JSON.stringify({ full_name: fullName, mobile_number: mobileNumber, email, password }) });
}

export function loginAccount({ email, password }) {
  return requestJson('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function updateProfile(token, { fullName, email, mobileNumber }) {
  return authenticatedRequest('/api/auth/me', token, {
    method: 'PATCH',
    body: JSON.stringify({ full_name: fullName, email, mobile_number: mobileNumber }),
  });
}

export async function uploadAvatar(token, file) {
  const formData = new FormData();
  formData.append('file', file);
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/me/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  } catch (error) {
    throw new ApiError('The profile image could not be uploaded.', 0, error);
  }
  const body = await response.json();
  if (!response.ok) throw new ApiError(getErrorMessage(body, 'The profile image could not be uploaded.'), response.status, body);
  return body;
}

function authenticatedRequest(path, token, options = {}) {
  return requestJson(path, { ...options, headers: { Authorization: `Bearer ${token}`, ...options.headers } });
}

export function getHistory(token) {
  return authenticatedRequest('/api/history', token);
}

export function getFavorites(token) {
  return authenticatedRequest('/api/favorites', token);
}

export function setFavorite(token, speechId, favorite) {
  return authenticatedRequest(`/api/history/${speechId}/favorite`, token, { method: favorite ? 'POST' : 'DELETE' });
}

export function renameHistory(token, speechId, title) {
  return authenticatedRequest(`/api/history/${speechId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export function deleteHistory(token, speechId) {
  return authenticatedRequest(`/api/history/${speechId}`, token, { method: 'DELETE' });
}

export async function extractDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/documents/extract`, { method: 'POST', body: formData });
  } catch (error) {
    throw new ApiError('The document could not be uploaded.', 0, error);
  }
  const body = await response.json();
  if (!response.ok) throw new ApiError(body.detail || 'The document could not be read.', response.status, body);
  return body;
}

export async function downloadAudio(audioUrl) {
  let response;
  try {
    response = await fetch(audioUrl);
  } catch (error) {
    throw new ApiError('The generated audio could not be downloaded.', 0, error);
  }

  if (!response.ok) {
    throw new ApiError(`Audio download failed with status ${response.status}.`, response.status);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = 'generated-speech.wav';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
