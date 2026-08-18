'use strict';

/**
 * Listas usadas pelo filtro heurístico de NSFW.
 * A detecção real de conteúdo em imagens/vídeos fica por conta da API
 * externa (Sightengine, opcional — ver visionApi.js).
 */

const NSFW_DOMAINS = [
  'pornhub.com', 'xvideos.com', 'xnxx.com', 'redtube.com', 'youporn.com',
  'xhamster.com', 'brazzers.com', 'onlyfans.com', 'chaturbate.com',
  'rule34.xxx', 'e621.net', 'nhentai.net', 'hentai.tv', 'spankbang.com',
  'stripchat.com', 'porn.com', 'sex.com',
];

const NSFW_KEYWORDS = [
  'porn', 'porno', 'pornografia', 'hentai', 'nude', 'nudes', 'nudez',
  'xxx', 'nsfw', 'sexo explicito', 'putaria', 'pornhub', 'onlyfans',
];

const MEDIA_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'mp4', 'mov', 'webm', 'mkv', 'avi'];

module.exports = { NSFW_DOMAINS, NSFW_KEYWORDS, MEDIA_EXTENSIONS };
