'use strict';

const play = require('play-dl');

/**
 * Configura o play-dl com o cookie do YouTube (se fornecido no .env).
 *
 * O YouTube bloqueia servidores de nuvem com "Sign in to confirm you're not
 * a bot". Passar o cookie de uma conta logada reduz muito esse bloqueio.
 */
async function initMusic() {
  try {
    const ffmpegPath = require('ffmpeg-static');
    if (ffmpegPath && !process.env.FFMPEG_PATH) {
      process.env.FFMPEG_PATH = ffmpegPath;
      console.log('[music] ffmpeg-static detectado.');
    }
  } catch {
    // sem ffmpeg-static: usa o ffmpeg do sistema, se houver
  }

  const cookie = process.env.YOUTUBE_COOKIE;
  if (!cookie) {
    console.warn('[music] YOUTUBE_COOKIE não definido — o YouTube pode bloquear a música ("Sign in to confirm you\'re not a bot").');
    return;
  }
  try {
    await play.setToken({ youtube: { cookie } });
    console.log('[music] play-dl configurado com o cookie do YouTube.');
  } catch (err) {
    console.error('[music] Falha ao configurar o cookie do YouTube:', err.message);
  }
}

module.exports = { initMusic };
