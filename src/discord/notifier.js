'use strict';

const { baseEmbed, logoAttachment, EMOJI, COLORS } = require('./embeds/theme');
const { centsToBRL } = require('../utils/format');

let clientRef = null;

function setClient(client) {
  clientRef = client;
}

async function notifyDepositCompleted(discordId, tx) {
  if (!clientRef) return;
  try {
    const user = await clientRef.users.fetch(discordId);
    const embed = baseEmbed({ color: COLORS.success })
      .setTitle(`${EMOJI.check} Depósito confirmado!`)
      .setDescription(
        `Seu depósito de **${centsToBRL(tx.amount_cents)}** foi confirmado e seu saldo já foi atualizado. ${EMOJI.blood}`
      );
    await user.send({ embeds: [embed], files: [logoAttachment()] });
  } catch (err) {
    console.warn(`[notifier] Não foi possível notificar ${discordId}:`, err.message);
  }
}

async function notifyWithdrawResolved(discordId, tx) {
  if (!clientRef) return;
  try {
    const user = await clientRef.users.fetch(discordId);
    const isCompleted = tx.status === 'completed';
    const embed = baseEmbed({ color: isCompleted ? COLORS.success : COLORS.danger })
      .setTitle(isCompleted ? `${EMOJI.check} Retirada concluída` : `${EMOJI.cross} Retirada cancelada`)
      .setDescription(
        isCompleted
          ? `Sua retirada de **${centsToBRL(tx.amount_cents)}** foi enviada via Pix.`
          : `Sua retirada de **${centsToBRL(tx.amount_cents)}** foi cancelada e o valor foi devolvido ao seu saldo.`
      );
    await user.send({ embeds: [embed], files: [logoAttachment()] });
  } catch (err) {
    console.warn(`[notifier] Não foi possível notificar ${discordId}:`, err.message);
  }
}

async function notifyAdminLog(config, embed) {
  if (!clientRef || !config.discord.logChannelId) return;
  try {
    const channel = await clientRef.channels.fetch(config.discord.logChannelId);
    if (channel?.isTextBased()) {
      await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.warn('[notifier] Não foi possível enviar log administrativo:', err.message);
  }
}

module.exports = { setClient, notifyDepositCompleted, notifyWithdrawResolved, notifyAdminLog };
