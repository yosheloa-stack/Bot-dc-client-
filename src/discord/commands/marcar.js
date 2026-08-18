'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { baseEmbed, logoAttachment, COLORS } = require('../embeds/theme');

/** /marcar — Marca (menciona) todo mundo no canal com uma mensagem. */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('marcar')
    .setDescription('Marca todo mundo (@everyone) com uma mensagem.')
    .addStringOption((opt) => opt.setName('mensagem').setDescription('Mensagem que acompanha a marcação').setRequired(false))
    .addBooleanOption((opt) => opt.setName('aqui').setDescription('Usar @here (só quem está online) em vez de @everyone').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone),

  async execute(interaction) {
    const text = interaction.options.getString('mensagem') || '';
    const here = interaction.options.getBoolean('aqui') || false;
    const mention = here ? '@here' : '@everyone';

    await interaction.reply({
      embeds: [baseEmbed({ color: COLORS.success }).setTitle('Marcação enviada').setDescription(`Membros marcados com ${mention}.`)],
      files: [logoAttachment()],
      ephemeral: true,
    });

    const embed = baseEmbed().setTitle(`📢 Aviso de ${interaction.user.username}`);
    if (text) embed.setDescription(text);

    await interaction.channel.send({
      content: mention,
      embeds: text ? [embed] : [],
      allowedMentions: { parse: ['everyone'] },
    });
  },
};
