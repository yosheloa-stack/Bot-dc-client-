'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, logoAttachment, COLORS } = require('../embeds/theme');
const music = require('../../music/manager');

/** /pular — Pula a música atual. */
module.exports = {
  data: new SlashCommandBuilder().setName('pular').setDescription('Pula a música que está tocando.'),

  async execute(interaction) {
    const player = music.getPlayer(interaction.guild);
    if (!player || !player.current) {
      return interaction.reply({
        embeds: [baseEmbed({ color: COLORS.accent }).setTitle('Nada tocando').setDescription('Não há música tocando no momento.')],
        files: [logoAttachment()],
        ephemeral: true,
      });
    }
    const skipped = player.current.title;
    player.skip();
    await interaction.reply({
      embeds: [baseEmbed({ color: COLORS.success }).setTitle('Pulada').setDescription(`⏭️ Pulei **${skipped}**.`)],
      files: [logoAttachment()],
    });
  },
};
