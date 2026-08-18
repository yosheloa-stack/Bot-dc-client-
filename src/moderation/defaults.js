'use strict';

/**
 * Configuração padrão de moderação aplicada a cada servidor novo.
 * Cada guild recebe sua própria cópia editável (tabela guild_settings) e
 * pode ser ajustada com `/admin moderacao`.
 */
const DEFAULT_SETTINGS = {
  // Canal onde o bot registra as ações de moderação (definido no /setup)
  logChannelId: null,
  // Cargo aplicado a quem é silenciado (definido no /setup)
  mutedRoleId: null,

  antiLink: {
    enabled: true,
    allowedRoles: ['Ceifador Admin', 'Moderador'],
    allowedChannels: [],
    whitelist: ['discord.gg', 'discord.com', 'youtube.com', 'youtu.be'],
    action: 'warn', // delete | warn | timeout | kick
    deleteMessage: true,
  },

  antiSpam: {
    enabled: true,
    maxMessages: 5,
    intervalMs: 5000,
    blockDuplicates: true,
    maxDuplicates: 3,
    action: 'timeout', // delete | warn | timeout | kick
    timeoutMs: 5 * 60 * 1000,
  },

  antiNsfw: {
    enabled: true,
    blockMediaOutsideNsfw: false,
    scanStickers: true,
    useExternalApi: true,
    apiThreshold: 0.6,
    action: 'kick', // delete | warn | timeout | kick
    deleteMessage: true,
  },

  warnings: {
    enabled: true,
    threshold: 3,
    punishment: 'kick', // timeout | kick | ban
    timeoutMs: 60 * 60 * 1000,
  },
};

module.exports = { DEFAULT_SETTINGS };
