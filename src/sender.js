import { CONFIG } from './config.js';

export async function sendDisplayPayload(payload) {
  const url = CONFIG.displayEndpoint;

  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Display PUT failed: ${res.status} ${res.statusText} ${text}`);
  }
}