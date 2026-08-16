'use strict';

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('node:path');

const COLORS = {
  primary: 0x8b0000,
  accent: 0xff1a1a,
  success: 0x2ecc71,
  danger: 0xe74c3c,
  neutral: 0x2f2f2f,
};

const EMOJI = {
  scythe: '🗡️',
  skull: '💀',
  blood: '🩸',
  coin: '🪙',
  check: '✅',
  cross: '❌',
  hourglass: '⏳',
  pix: '💠',
  chart: '📜',
};

const LOGO_PATH = path.join(__dirname, '..', '..', '..', 'assets', 'img', 'ceifador-logo.png');

function logoAttachment() {
  return new AttachmentBuilder(LOGO_PATH, { name: 'ceifador-logo.png' });
}

function baseEmbed({ color = COLORS.primary, withThumbnail = true } = {}) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setFooter({ text: '🗡️ CEIFADOR • Sistema de Pagamentos', iconURL: withThumbnail ? 'attachment://ceifador-logo.png' : undefined })
    .setTimestamp();
  if (withThumbnail) {
    embed.setThumbnail('attachment://ceifador-logo.png');
  }
  return embed;
}

module.exports = { COLORS, EMOJI, baseEmbed, logoAttachment, LOGO_PATH };
