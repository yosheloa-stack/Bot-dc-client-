'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, logoAttachment, COLORS } = require('../embeds/theme');
const music = require('../../music/manager');

/** /pausar — Pausa a música atual. */
module.exports = {
  data: new SlashCommandBuilder().setName('pausar').setDescription('Pausa a música atual.'),

  async execute(interaction) {
    const player = music.getPlayer(interaction.guild);
    if (!player || !player.current) {
      return interaction.reply({
        embeds: [baseEmbed({ color: COLORS.accent }).setTitle('Nada tocando').setDescription('Não há música tocando.')],
        files: [logoAttachment()],
        ephemeral: true,
      });
    }
    player.pause();
    await interaction.reply({
      embeds: [baseEmbed({ color: COLORS.success }).setTitle('Pausado').setDescription('⏸️ Música pausada. Use `/retomar` para continuar.')],
      files: [logoAttachment()],
    });
  },
};
