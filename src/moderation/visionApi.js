'use strict';

/**
 * Integração OPCIONAL com a API de visão computacional Sightengine, para
 * detecção real de conteúdo adulto em imagens, gifs e vídeos.
 *
 * Ativa automaticamente quando SIGHTENGINE_API_USER e SIGHTENGINE_API_SECRET
 * estão definidos no .env. Sem essas chaves, o Anti-NSFW usa apenas o
 * filtro heurístico (texto, links e nomes de figurinha).
 *
 * Docs: https://sightengine.com/docs/
 */

const API_USER = () => process.env.SIGHTENGINE_API_USER;
const API_SECRET = () => process.env.SIGHTENGINE_API_SECRET;

function isConfigured() {
  return Boolean(API_USER() && API_SECRET());
}

const IMAGE_ENDPOINT = 'https://api.sightengine.com/1.0/check.json';
const VIDEO_ENDPOINT = 'https://api.sightengine.com/1.0/video/check-sync.json';

async function scan(url, isVideo = false) {
  if (!isConfigured()) return null;

  try {
    const endpoint = isVideo ? VIDEO_ENDPOINT : IMAGE_ENDPOINT;
    const params = new URLSearchParams({
      url,
      models: 'nudity-2.1',
      api_user: API_USER(),
      api_secret: API_SECRET(),
    });

    const res = await fetch(`${endpoint}?${params.toString()}`);
    if (!res.ok) {
      console.warn(`[vision] Sightengine respondeu ${res.status}`);
      return null;
    }
    const data = await res.json();
    return isVideo ? parseVideo(data) : parseImage(data);
  } catch (err) {
    console.error('[vision] Erro na API de visão:', err.message);
    return null;
  }
}

function nudityScore(nudity) {
  if (!nudity) return 0;
  const explicit = nudity.sexual_activity ?? 0;
  const display = nudity.sexual_display ?? 0;
  const erotica = nudity.erotica ?? 0;
  const suggestive = nudity.suggestive ?? 0;
  return Math.max(explicit, display, erotica, suggestive * 0.7);
}

function parseImage(data) {
  const score = nudityScore(data.nudity);
  return { nsfw: score > 0, score };
}

function parseVideo(data) {
  let worst = 0;
  const frames = data?.data?.frames || [];
  for (const frame of frames) {
    worst = Math.max(worst, nudityScore(frame.nudity));
  }
  return { nsfw: worst > 0, score: worst };
}

module.exports = { scan, isConfigured };
