'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, logoAttachment, COLORS } = require('../embeds/theme');
const music = require('../../music/manager');

/** /fila — Mostra a música atual e as próximas da fila. */
module.exports = {
  data: new SlashCommandBuilder().setName('fila').setDescription('Mostra a fila de músicas.'),

  async execute(interaction) {
    const player = music.getPlayer(interaction.guild);
    if (!player || (!player.current && player.queue.length === 0)) {
      return interaction.reply({
        embeds: [baseEmbed({ color: COLORS.accent }).setTitle('Fila vazia').setDescription('Não há músicas na fila.')],
        files: [logoAttachment()],
        ephemeral: true,
      });
    }

    const linhas = [];
    if (player.current) linhas.push(`▶️ **Tocando:** ${player.current.title}`);

    if (player.queue.length) {
      const proximas = player.queue.slice(0, 10).map((t, i) => `\`${i + 1}.\` ${t.title}`).join('\n');
      linhas.push('', '**Próximas:**', proximas);
      if (player.queue.length > 10) linhas.push(`… e mais ${player.queue.length - 10}.`);
    }

    await interaction.reply({
      embeds: [baseEmbed().setTitle('🎶 Fila de músicas').setDescription(linhas.join('\n'))],
      files: [logoAttachment()],
      ephemeral: true,
    });
  },
};
