const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function requestJson(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
  } catch (error) {
    throw new ApiError('The backend could not be reached.', 0, error);
  }

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const detail = typeof body === 'object' && body !== null ? body.detail : body;
    throw new ApiError(detail || `Request failed with status ${response.status}.`, response.status, body);
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

export function generateSpeech({ text, language, voice }) {
  return requestJson('/api/tts', {
    method: 'POST',
    body: JSON.stringify({ text, language, voice }),
  });
}

