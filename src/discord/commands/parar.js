'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, logoAttachment, COLORS } = require('../embeds/theme');
const music = require('../../music/manager');

/** /parar — Para a música, limpa a fila e sai da call. */
module.exports = {
  data: new SlashCommandBuilder().setName('parar').setDescription('Para a música, limpa a fila e sai do canal de voz.'),

  async execute(interaction) {
    const player = music.getPlayer(interaction.guild);
    if (!player) {
      return interaction.reply({
        embeds: [baseEmbed({ color: COLORS.accent }).setTitle('Nada tocando').setDescription('Não estou tocando nada.')],
        files: [logoAttachment()],
        ephemeral: true,
      });
    }
    player.stop();
    await interaction.reply({
      embeds: [baseEmbed({ color: COLORS.success }).setTitle('Parado').setDescription('⏹️ Música parada e fila limpa. Saindo da call.')],
      files: [logoAttachment()],
    });
  },
};
