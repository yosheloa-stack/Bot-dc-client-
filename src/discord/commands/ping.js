'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, logoAttachment } = require('../embeds/theme');

/** /ping — Mostra a latência do bot. */
module.exports = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Mostra a latência do bot.'),

  async execute(interaction) {
    await interaction.reply({
      embeds: [baseEmbed().setTitle('🏓 Pong!').setDescription('Calculando latência...')],
      files: [logoAttachment()],
      ephemeral: true,
    });
    const latency = Date.now() - interaction.createdTimestamp;
    const api = Math.round(interaction.client.ws.ping);
    await interaction.editReply({
      embeds: [baseEmbed().setTitle('🏓 Pong!').setDescription(`Resposta: **${latency}ms**\nAPI: **${api}ms**`)],
      files: [logoAttachment()],
    });
  },
};
