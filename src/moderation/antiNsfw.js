'use strict';

const guildSettingsRepository = require('../repositories/guildSettingsRepository');
const modActions = require('./modActions');
const vision = require('./visionApi');
const { NSFW_DOMAINS, NSFW_KEYWORDS, MEDIA_EXTENSIONS } = require('./nsfwData');

const COMBINING_DIACRITICS_START = 0x0300;
const COMBINING_DIACRITICS_END = 0x036f;

function normalize(text) {
  const decomposed = (text || '').toLowerCase().normalize('NFD');
  let out = '';
  for (const ch of decomposed) {
    const code = ch.codePointAt(0);
    if (code >= COMBINING_DIACRITICS_START && code <= COMBINING_DIACRITICS_END) continue;
    out += ch;
  }
  return out;
}

function hasKeyword(text) {
  const norm = normalize(text);
  return NSFW_KEYWORDS.some((kw) => {
    const k = normalize(kw);
    const re = new RegExp(`(^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
    return re.test(norm);
  });
}

function hasNsfwDomain(text) {
  const norm = normalize(text);
  return NSFW_DOMAINS.some((d) => norm.includes(d));
}

function extOf(url) {
  const clean = url.split('?')[0].toLowerCase();
  const dot = clean.lastIndexOf('.');
  return dot === -1 ? '' : clean.slice(dot + 1);
}

function collectMedia(message) {
  const items = [];
  for (const att of message.attachments.values()) {
    const ext = extOf(att.name || att.url);
    if (MEDIA_EXTENSIONS.includes(ext)) {
      items.push({ url: att.url, video: ['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext) });
    }
  }
  for (const emb of message.embeds) {
    if (emb.image?.url) items.push({ url: emb.image.url, video: false });
    if (emb.thumbnail?.url) items.push({ url: emb.thumbnail.url, video: false });
    if (emb.video?.url) items.push({ url: emb.video.url, video: true });
  }
  return items;
}

/** @returns {Promise<boolean>} true se detectou e tratou NSFW */
async function check(message) {
  const settings = guildSettingsRepository.getSettings(message.guild.id).antiNsfw;
  if (!settings.enabled) return false;
  if (!message.member) return false;

  const channelIsNsfw = Boolean(message.channel.nsfw);

  let reason = null;

  if (hasKeyword(message.content)) reason = 'Conteúdo textual explícito (NSFW)';

  if (!reason && hasNsfwDomain(message.content)) reason = 'Link de site adulto (NSFW)';

  if (!reason && settings.scanStickers && message.stickers.size > 0) {
    const bad = [...message.stickers.values()].some((s) => hasKeyword(s.name));
    if (bad) reason = 'Figurinha com conteúdo NSFW';
  }

  if (!reason) {
    const media = collectMedia(message);
    if (media.length > 0) {
      if (settings.blockMediaOutsideNsfw && !channelIsNsfw) {
        reason = 'Mídia enviada fora de canal NSFW';
      }

      if (!reason && settings.useExternalApi && vision.isConfigured() && !channelIsNsfw) {
        for (const item of media) {
          const result = await vision.scan(item.url, item.video);
          if (result && result.nsfw && result.score >= settings.apiThreshold) {
            reason = `Mídia com conteúdo adulto detectado (${Math.round(result.score * 100)}%)`;
            break;
          }
        }
      }
    }
  }

  if (!reason) return false;

  await modActions.apply({
    member: message.member,
    message,
    action: settings.action,
    reason,
    deleteMessage: settings.deleteMessage,
  });
  return true;
}

module.exports = { check };
