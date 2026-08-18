'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, OAuth2Scopes, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { baseEmbed, logoAttachment } = require('../embeds/theme');

/** Permissões que o Ceifador precisa para funcionar em um servidor novo. */
const REQUIRED_PERMISSIONS = [
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.MentionEveryone,
  PermissionFlagsBits.Connect,
  PermissionFlagsBits.Speak,
  PermissionFlagsBits.UseVAD,
];

/** /convite — Gera o link para adicionar o Ceifador em outros servidores. */
module.exports = {
  data: new SlashCommandBuilder().setName('convite').setDescription('Gera o link para adicionar o Ceifador em outros servidores.'),

  async execute(interaction) {
    const invite = interaction.client.generateInvite({
      scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
      permissions: REQUIRED_PERMISSIONS,
    });

    const embed = baseEmbed()
      .setTitle('➕ Adicionar o Ceifador em outro servidor')
      .setDescription(
        [
          'Clique no botão abaixo para adicionar o **Ceifador** em qualquer servidor.',
          '',
          '> ℹ️ Só é possível adicionar em servidores onde você tem a permissão',
          '> **Gerenciar Servidor**. Depois de adicionar, rode `/setup` por lá.',
        ].join('\n')
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Adicionar em um servidor').setEmoji('➕').setURL(invite)
    );

    await interaction.reply({ embeds: [embed], files: [logoAttachment()], components: [row], ephemeral: true });
  },
};
