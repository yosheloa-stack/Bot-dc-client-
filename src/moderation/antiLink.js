'use strict';

const guildSettingsRepository = require('../repositories/guildSettingsRepository');
const modActions = require('./modActions');

const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.gg\/[^\s]+)|([a-z0-9-]+\.(com|net|org|io|gg|xyz|tv|me|br|link|store|shop)\b[^\s]*)/gi;

function extractDomain(raw) {
  try {
    const withProto = raw.startsWith('http') ? raw : `http://${raw}`;
    return new URL(withProto).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

/** @returns {Promise<boolean>} true se a mensagem foi tratada (link bloqueado) */
async function check(message) {
  const settings = guildSettingsRepository.getSettings(message.guild.id).antiLink;
  if (!settings.enabled) return false;

  const member = message.member;
  if (!member) return false;

  const allowedRoleSet = new Set(settings.allowedRoles);
  const hasAllowedRole = member.roles.cache.some((r) => allowedRoleSet.has(r.name));
  if (hasAllowedRole) return false;

  if (settings.allowedChannels.includes(message.channelId)) return false;

  const matches = message.content.match(URL_REGEX);
  if (!matches) return false;

  const whitelist = settings.whitelist.map((d) => d.toLowerCase());
  const allWhitelisted = matches.every((m) => {
    const domain = extractDomain(m);
    return whitelist.some((w) => domain === w || domain.endsWith(`.${w}`));
  });
  if (allWhitelisted) return false;

  await modActions.apply({
    member,
    message,
    action: settings.action,
    reason: 'Envio de link não permitido',
    deleteMessage: settings.deleteMessage,
  });
  return true;
}

module.exports = { check };
