'use strict';

const { SlashCommandBuilder } = require('discord.js');
const balanceService = require('../../services/balanceService');
const { baseEmbed, logoAttachment, EMOJI, COLORS } = require('../embeds/theme');
const { centsToBRL } = require('../../utils/format');
const { isAdmin } = require('../permissions');
const { getConfig } = require('../../config/env');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('saldo')
    .setDescription('Consulta seu saldo atual no Ceifador.')
    .addUserOption((option) =>
      option.setName('usuario').setDescription('(Admin) Consultar o saldo de outro usuário').setRequired(false)
    ),

  async execute(interaction) {
    const config = getConfig();
    const targetUser = interaction.options.getUser('usuario');

    if (targetUser && targetUser.id !== interaction.user.id && !isAdmin(interaction, config)) {
      return interaction.reply({
        content: `${EMOJI.cross} Apenas administradores podem consultar o saldo de outros usuários.`,
        ephemeral: true,
      });
    }

    const user = targetUser || interaction.user;
    const balanceCents = balanceService.getBalance(user.id, user.username);

    const embed = baseEmbed()
      .setTitle(`${EMOJI.skull} Saldo de ${user.username}`)
      .setDescription(`${EMOJI.coin} **${centsToBRL(balanceCents)}**`)
      .addFields({ name: 'Como adicionar saldo', value: `Use \`/depositar\` para gerar um Pix ${EMOJI.pix}` });

    await interaction.reply({
      embeds: [embed],
      files: [logoAttachment()],
      ephemeral: true,
    });
  },
};
