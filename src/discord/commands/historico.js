'use strict';

const { SlashCommandBuilder } = require('discord.js');
const balanceService = require('../../services/balanceService');
const { baseEmbed, logoAttachment, EMOJI } = require('../embeds/theme');
const { centsToBRL, formatDate } = require('../../utils/format');
const { typeLabel, statusLabel } = require('../../utils/labels');

const STATUS_EMOJI = {
  completed: '✅',
  pending: '⏳',
  failed: '❌',
  cancelled: '🚫',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('historico')
    .setDescription('Mostra suas últimas transações.'),

  async execute(interaction) {
    const transactions = balanceService.history(interaction.user.id, 10);

    const embed = baseEmbed().setTitle(`${EMOJI.chart} Histórico de ${interaction.user.username}`);

    if (transactions.length === 0) {
      embed.setDescription('Nenhuma transação encontrada ainda.');
    } else {
      embed.setDescription(
        transactions
          .map((tx) => {
            const emoji = STATUS_EMOJI[tx.status] || '•';
            const sign = tx.type === 'withdraw' || tx.type === 'admin_debit' ? '-' : '+';
            return `${emoji} **${typeLabel(tx.type)}** ${sign}${centsToBRL(tx.amount_cents)} — ${statusLabel(tx.status)} — ${formatDate(tx.created_at)}`;
          })
          .join('\n')
      );
    }

    await interaction.reply({ embeds: [embed], files: [logoAttachment()], ephemeral: true });
  },
};
