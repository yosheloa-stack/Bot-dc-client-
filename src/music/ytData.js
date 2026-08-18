'use strict';

/**
 * YouTube Data API v3 (oficial do Google) para BUSCA e PLAYLIST.
 * Confiável na nuvem (não sofre o bloqueio "not a bot").
 *
 * Ativa quando YOUTUBE_API_KEY está no .env. Chave gratuita em
 * https://console.cloud.google.com — API "YouTube Data API v3" →
 * Credenciais → Chave de API.
 *
 * O ÁUDIO em si vem de outra fonte (ver ytApi.js / play-dl); aqui só
 * buscamos metadados (título, id, autor) para montar a fila.
 */

const BASE = 'https://www.googleapis.com/youtube/v3';
const KEY = () => process.env.YOUTUBE_API_KEY;

function isConfigured() {
  return Boolean(KEY());
}

function decode(str) {
  return (str || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function toTrack(item, requestedBy) {
  const sn = item.snippet || {};
  const vid = item.id?.videoId || item.contentDetails?.videoId || sn.resourceId?.videoId;
  const thumbs = sn.thumbnails || {};
  return {
    title: decode(sn.title || 'Sem título'),
    url: `https://www.youtube.com/watch?v=${vid}`,
    durationRaw: null,
    thumbnail: (thumbs.medium || thumbs.high || thumbs.default || {}).url || null,
    author: decode(sn.videoOwnerChannelTitle || sn.channelTitle || '—'),
    requestedBy,
  };
}

async function search(query, requestedBy) {
  const run = async (music) => {
    const cat = music ? '&videoCategoryId=10' : '';
    const url = `${BASE}/search?part=snippet&type=video&maxResults=5${cat}&q=${encodeURIComponent(query)}&key=${KEY()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube API ${res.status}`);
    const data = await res.json();
    const item = (data.items || []).find((i) => i.id?.videoId);
    return item ? toTrack(item, requestedBy) : null;
  };
  try {
    return (await run(true)) || (await run(false));
  } catch (err) {
    console.error('[music] YouTube Data (search) falhou:', err.message);
    return null;
  }
}

async function getPlaylist(playlistId, requestedBy, max = 100) {
  const tracks = [];
  let pageToken = '';
  try {
    do {
      const url = `${BASE}/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${encodeURIComponent(playlistId)}&key=${KEY()}${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`YouTube API ${res.status}`);
      const data = await res.json();
      for (const item of data.items || []) {
        if (item.contentDetails?.videoId) tracks.push(toTrack(item, requestedBy));
        if (tracks.length >= max) break;
      }
      pageToken = data.nextPageToken || '';
    } while (pageToken && tracks.length < max);
  } catch (err) {
    console.error('[music] YouTube Data (playlist) falhou:', err.message);
  }
  return { tracks, playlistTitle: tracks.length ? 'Playlist' : null };
}

async function searchPlaylist(query, requestedBy, max = 100) {
  try {
    const url = `${BASE}/search?part=snippet&type=playlist&maxResults=1&q=${encodeURIComponent(query)}&key=${KEY()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube API ${res.status}`);
    const data = await res.json();
    const pid = data.items?.[0]?.id?.playlistId;
    if (pid) return getPlaylist(pid, requestedBy, max);
  } catch (err) {
    console.error('[music] YouTube Data (searchPlaylist) falhou:', err.message);
  }
  return { tracks: [], playlistTitle: null };
}

module.exports = { isConfigured, search, getPlaylist, searchPlaylist };
