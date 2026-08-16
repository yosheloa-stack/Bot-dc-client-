'use strict';

const { Events } = require('discord.js');
const { baseEmbed, logoAttachment, EMOJI, COLORS } = require('../embeds/theme');
const passeService = require('../services/passeService');
const balanceService = require('../../services/balanceService');
const { getConfig } = require('../../config/env');

async function handlePasseButton(interaction) {
  const [action, ownerId, id] = interaction.customId.split(':');
  if (!ownerId || !id) return;
  if (interaction.user.id !== ownerId) {
    return interaction.reply({
      content: `${EMOJI.cross} Esta confirmação pertence a outro usuário.`,
      ephemeral: true,
    });
  }

  if (action === 'passe_cancel') {
    return interaction.update({
      embeds: [baseEmbed().setTitle(`${EMOJI.cross} Envio cancelado`).setDescription('Nenhum passe foi enviado e o estoque não foi alterado.')],
      components: [],
      files: [logoAttachment()],
    });
  }

  if (action !== 'passe_confirm') return;
  await interaction.deferUpdate();
  let sale;
  try {
    const config = getConfig();
    sale = balanceService.reservePasse({
      discordId: interaction.user.id,
      username: interaction.user.username,
      amountCents: config.passe.priceCents,
      playerId: id,
    });
    const result = await passeService.sendPasse(id, config);
    balanceService.completePasse(sale.id, interaction.user.id);
    const remaining = result.estoque_restante !== undefined ? `\nEstoque restante: **${result.estoque_restante}**` : '';
    return interaction.editReply({
      embeds: [baseEmbed().setTitle(`${EMOJI.check} Passe enviado com sucesso`).setDescription(`O Passe Booyah foi enviado para o ID \`${id}\`.${remaining}`)],
      components: [],
      files: [logoAttachment()],
    });
  } catch (err) {
    if (sale) {
      try {
        balanceService.cancelPasse(sale.id, 'passe_api_failure');
      } catch (rollbackError) {
        console.error('[discord] Falha ao estornar venda de passe:', rollbackError);
      }
    }
    return interaction.editReply({
      embeds: [baseEmbed({ color: COLORS.danger }).setTitle(`${EMOJI.cross} Passe não enviado`).setDescription(err.message)],
      components: [],
      files: [logoAttachment()],
    });
  }
}

module.exports = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction) {
    if (interaction.isButton() && interaction.customId.startsWith('passe_')) {
      return handlePasseButton(interaction);
    }
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
