'use strict';

const { Events, PermissionFlagsBits } = require('discord.js');
const antiNsfw = require('../../moderation/antiNsfw');
const antiLink = require('../../moderation/antiLink');
const antiSpam = require('../../moderation/antiSpam');

/**
 * Pipeline de moderação automática, em ordem de gravidade:
 * 1) Anti-NSFW  (mais grave)
 * 2) Anti-Link
 * 3) Anti-Spam
 *
 * Cada filtro retorna true quando trata a mensagem, interrompendo o pipeline.
 */
module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    if (!message.guild || message.author.bot || message.webhookId) return;
    if (message.member?.permissions.has(PermissionFlagsBits.Administrator)) return;

    try {
      if (await antiNsfw.check(message)) return;
      if (await antiLink.check(message)) return;
      if (await antiSpam.check(message)) return;
    } catch (err) {
      console.error('[moderation] Erro no pipeline de moderação:', err.message);
    }
  },
};
