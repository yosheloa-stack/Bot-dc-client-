'use strict';

const { Readable } = require('node:stream');
const { StreamType } = require('@discordjs/voice');

/**
 * Cliente OPCIONAL de uma API de terceiros para baixar áudio do YouTube,
 * contornando o bloqueio "Sign in to confirm you're not a bot" que o
 * YouTube aplica a IPs de datacenter/nuvem.
 *
 * Totalmente opcional: sem YTAUDIO_API_KEY configurada, a música toca
 * normalmente via play-dl (biblioteca open source padrão do ecossistema
 * discord.js), só perde esse contorno específico de bloqueio de nuvem.
 *
 * Configuração no .env:
 *   YTAUDIO_API_URL   (opcional, aponta para a sua própria instância)
 *   YTAUDIO_API_KEY
 */

let dispatcher = null;
try {
  const { Agent, setGlobalDispatcher } = require('undici');
  dispatcher = new Agent({ headersTimeout: 30000, bodyTimeout: 0, connect: { timeout: 30000 } });
  setGlobalDispatcher(dispatcher);
} catch {
  // undici indisponível: usa o fetch padrão
}

const fetchOpts = (extra = {}) => ({
  headers: { 'User-Agent': 'Ceifador-Bot' },
  ...(dispatcher ? { dispatcher } : {}),
  ...extra,
});

const BASE = () => process.env.YTAUDIO_API_URL || '';
const KEY = () => process.env.YTAUDIO_API_KEY;

function isConfigured() {
  return Boolean(KEY() && BASE());
}

function buildUrl(ytUrl) {
  const sep = BASE().includes('?') ? '&' : '?';
  return `${BASE()}${sep}url=${encodeURIComponent(ytUrl)}&apikey=${encodeURIComponent(KEY())}`;
}

/** Procura recursivamente no JSON a melhor URL de áudio. */
function deepFindUrl(obj) {
  const urls = [];
  const walk = (v) => {
    if (!v) return;
    if (typeof v === 'string') {
      if (/^https?:\/\//i.test(v)) urls.push(v);
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (typeof v === 'object') {
      Object.values(v).forEach(walk);
    }
  };
  walk(obj);
  if (!urls.length) return null;

  const score = (u) => {
    const s = u.toLowerCase();
    let n = 0;
    if (s.includes('googlevideo')) n += 5;
    if (/\.(mp3|m4a|opus|webm|ogg|aac)(\?|$)/.test(s)) n += 4;
    if (s.includes('audio')) n += 3;
    if (s.includes('/dl') || s.includes('cdn') || s.includes('download')) n += 2;
    n += Math.min(u.length / 100, 2);
    return n;
  };
  urls.sort((a, b) => score(b) - score(a));
  return urls[0];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getStreamOnce(ytUrl) {
  if (!isConfigured()) throw new Error('API de áudio não configurada.');

  const res = await fetch(buildUrl(ytUrl), fetchOpts());
  if (!res.ok || !res.body) throw new Error(`API de áudio respondeu HTTP ${res.status}.`);

  const ct = (res.headers.get('content-type') || '').toLowerCase();

  if (ct.startsWith('audio') || ct.includes('octet-stream') || ct.includes('mpeg') || ct.includes('video')) {
    return { stream: Readable.fromWeb(res.body), type: StreamType.Arbitrary };
  }

  const data = await res.json().catch(() => null);
  const audioUrl = deepFindUrl(data);
  if (!audioUrl) throw new Error(`API não retornou link de áudio. Resposta: ${JSON.stringify(data).slice(0, 200)}`);

  const audioRes = await fetch(audioUrl, fetchOpts());
  if (!audioRes.ok || !audioRes.body) throw new Error(`Falha ao baixar o áudio (HTTP ${audioRes.status}).`);
  return { stream: Readable.fromWeb(audioRes.body), type: StreamType.Arbitrary };
}

/** Devolve um stream tocável, com retry em caso de falha pontual da API. */
async function getStream(ytUrl, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await getStreamOnce(ytUrl);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        console.warn(`[music] API de áudio falhou (tentativa ${i + 1}/${attempts}): ${err.message}`);
        await sleep(1000 * (i + 1));
      }
    }
  }
  throw lastErr;
}

module.exports = { isConfigured, getStream, deepFindUrl };
