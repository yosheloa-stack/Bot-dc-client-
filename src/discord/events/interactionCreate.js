'use strict';

const { Events } = require('discord.js');
const { baseEmbed, logoAttachment, EMOJI, COLORS } = require('../embeds/theme');

module.exports = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`[discord] Erro ao executar /${interaction.commandName}:`, err);
      const embed = baseEmbed({ color: COLORS.danger })
        .setTitle(`${EMOJI.cross} Ocorreu um erro`)
        .setDescription('Algo deu errado ao processar seu comando. Tente novamente em instantes.');

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed], files: [logoAttachment()] }).catch(() => {});
      } else {
        await interaction.reply({ embeds: [embed], files: [logoAttachment()], ephemeral: true }).catch(() => {});
      }
    }
  },
};
