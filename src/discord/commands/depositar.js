'use strict';

const crypto = require('node:crypto');
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getConfig } = require('../../config/env');
const { getPixProvider } = require('../../services/pix');
const balanceService = require('../../services/balanceService');
const { baseEmbed, logoAttachment, EMOJI, COLORS } = require('../embeds/theme');
const { centsToBRL, reaisToCents } = require('../../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('depositar')
    .setDescription('Gera uma cobrança Pix para adicionar saldo.')
    .addNumberOption((option) =>
      option
        .setName('valor')
        .setDescription('Valor em reais (ex: 25.50)')
        .setRequired(true)
        .setMinValue(0.01)
        .setMaxValue(50000)
    ),

  async execute(interaction) {
    const config = getConfig();
    const amountCents = reaisToCents(interaction.options.getNumber('valor', true));

    if (amountCents < config.pix.minDepositCents || amountCents > config.pix.maxDepositCents) {
      return interaction.reply({
        content: `${EMOJI.cross} O valor deve estar entre ${centsToBRL(config.pix.minDepositCents)} e ${centsToBRL(config.pix.maxDepositCents)}.`,
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const provider = getPixProvider(config);
    const referenceId = crypto.randomUUID();

    let charge;
    try {
      charge = await provider.createCharge({
        amountCents,
        description: `Deposito Ceifador - ${interaction.user.username}`,
        referenceId,
      });
    } catch (err) {
      const embed = baseEmbed({ color: COLORS.danger })
        .setTitle(`${EMOJI.cross} Não foi possível gerar o Pix`)
        .setDescription(err.message);
      return interaction.editReply({ embeds: [embed], files: [logoAttachment()] });
    }

    balanceService.createPendingDeposit({
      id: referenceId,
      discordId: interaction.user.id,
      username: interaction.user.username,
      amountCents,
      provider: config.pix.provider,
      providerTxid: charge.providerTxid,
      pixCopyPaste: charge.copyPaste,
      pixQrcodeBase64: charge.qrCodeBase64,
      description: `Depósito solicitado via /depositar`,
    });

    const files = [logoAttachment()];
    const embed = baseEmbed()
      .setTitle(`${EMOJI.pix} Pix gerado — ${centsToBRL(amountCents)}`)
      .setDescription(
        [
          `${EMOJI.hourglass} Pague o Pix abaixo. Seu saldo será liberado ${charge.automatic ? 'automaticamente' : 'após confirmação manual do administrador'} assim que o pagamento for identificado.`,
          '',
          '**Pix Copia e Cola:**',
          `\`\`\`${charge.copyPaste}\`\`\``,
        ].join('\n')
      );

    if (charge.qrCodeBase64) {
      const qrBuffer = Buffer.from(charge.qrCodeBase64, 'base64');
      files.push(new AttachmentBuilder(qrBuffer, { name: 'pix-qrcode.png' }));
      embed.setImage('attachment://pix-qrcode.png');
    }

    await interaction.editReply({ embeds: [embed], files });
  },
};
