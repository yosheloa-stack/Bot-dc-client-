'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, logoAttachment, COLORS } = require('../embeds/theme');
const music = require('../../music/manager');

/** /retomar — Retoma a música pausada. */
module.exports = {
  data: new SlashCommandBuilder().setName('retomar').setDescription('Retoma a música pausada.'),

  async execute(interaction) {
    const player = music.getPlayer(interaction.guild);
    if (!player || !player.current) {
      return interaction.reply({
        embeds: [baseEmbed({ color: COLORS.accent }).setTitle('Nada tocando').setDescription('Não há música para retomar.')],
        files: [logoAttachment()],
        ephemeral: true,
      });
    }
    player.resume();
    await interaction.reply({
      embeds: [baseEmbed({ color: COLORS.success }).setTitle('Retomado').setDescription('▶️ Voltando a tocar.')],
      files: [logoAttachment()],
    });
  },
};
