'use strict';

const { SlashCommandBuilder } = require('discord.js');
const balanceService = require('../../services/balanceService');
const { baseEmbed, logoAttachment, EMOJI, COLORS } = require('../embeds/theme');
const { centsToBRL, reaisToCents } = require('../../utils/format');
const { getConfig } = require('../../config/env');
const { notifyAdminLog } = require('../notifier');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sacar')
    .setDescription('Solicita a retirada do saldo via Pix.')
    .addNumberOption((option) =>
      option.setName('valor').setDescription('Valor em reais a retirar').setRequired(true).setMinValue(0.01)
    )
    .addStringOption((option) =>
      option.setName('chave_pix').setDescription('Chave Pix para receber o valor').setRequired(true).setMaxLength(140)
    ),

  async execute(interaction) {
    const amountCents = reaisToCents(interaction.options.getNumber('valor', true));
    const pixKey = interaction.options.getString('chave_pix', true).trim();

    let tx;
    try {
      tx = balanceService.requestWithdraw({
        discordId: interaction.user.id,
        username: interaction.user.username,
        amountCents,
        pixKey,
      });
    } catch (err) {
      const embed = baseEmbed({ color: COLORS.danger })
        .setTitle(`${EMOJI.cross} Não foi possível solicitar a retirada`)
        .setDescription(err.message);
      return interaction.reply({ embeds: [embed], files: [logoAttachment()], ephemeral: true });
    }

    const embed = baseEmbed()
      .setTitle(`${EMOJI.hourglass} Retirada solicitada`)
      .setDescription(
        [
          `Sua solicitação de **${centsToBRL(amountCents)}** foi registrada e o valor foi reservado do seu saldo.`,
          `Chave Pix de destino: \`${pixKey}\``,
          '',
          'Um administrador irá processar o envio manualmente. Você será avisado por aqui quando for concluído.',
        ].join('\n')
      )
      .addFields({ name: 'ID da solicitação', value: `\`${tx.id}\`` });

    await interaction.reply({ embeds: [embed], files: [logoAttachment()], ephemeral: true });

    const config = getConfig();
    const logEmbed = baseEmbed({ color: COLORS.accent })
      .setTitle(`${EMOJI.scythe} Nova retirada pendente`)
      .setDescription(
        [
          `**Usuário:** <@${interaction.user.id}> (${interaction.user.username})`,
          `**Valor:** ${centsToBRL(amountCents)}`,
          `**Chave Pix:** \`${pixKey}\``,
          `**ID:** \`${tx.id}\``,
          '',
          'Processe com `/admin saques concluir` ou `/admin saques cancelar`.',
        ].join('\n')
      );
    await notifyAdminLog(config, logEmbed);
  },
};
