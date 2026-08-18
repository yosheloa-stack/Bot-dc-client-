'use strict';

const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const passeService = require('../../services/passeService');
const balanceService = require('../../services/balanceService');
const { baseEmbed, logoAttachment, EMOJI, COLORS } = require('../embeds/theme');
const { getConfig } = require('../../config/env');
const { centsToBRL } = require('../../utils/format');
const { isAdmin } = require('../permissions');

function errorEmbed(message) {
  return baseEmbed({ color: COLORS.danger })
    .setTitle(`${EMOJI.cross} Não foi possível processar o passe`)
    .setDescription(message);
}

function adminOnly(interaction) {
  const config = getConfig();
  if (!isAdmin(interaction, config)) {
    return interaction.reply({
      content: `${EMOJI.cross} Apenas administradores podem consultar informações da API de passe.`,
      ephemeral: true,
    });
  }
  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('passe')
    .setDescription('Envia um Passe Booyah para um jogador.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('enviar')
        .setDescription('Confere o jogador e solicita confirmação antes de enviar.')
        .addStringOption((option) =>
          option.setName('id').setDescription('ID do jogador que receberá o passe').setRequired(true).setMinLength(5).setMaxLength(20)
        )
    )
    .addSubcommand((subcommand) => subcommand.setName('estoque').setDescription('(Admin) Consulta o estoque disponível.'))
    .addSubcommand((subcommand) => subcommand.setName('dias').setDescription('(Admin) Consulta a validade da chave.')),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const config = getConfig();

    if (subcommand === 'enviar') {
      const id = interaction.options.getString('id', true).trim();
      if (!config.passe.priceCents || config.passe.priceCents <= 0) {
        return interaction.reply({ embeds: [errorEmbed('O preço do passe ainda não foi configurado pelo administrador.')], files: [logoAttachment()], ephemeral: true });
      }
      const balanceCents = balanceService.getBalance(interaction.user.id, interaction.user.username);
      if (balanceCents < config.passe.priceCents) {
        return interaction.reply({
          embeds: [errorEmbed(`Saldo insuficiente. Preço do passe: **${centsToBRL(config.passe.priceCents)}**. Seu saldo: **${centsToBRL(balanceCents)}**.`)],
          files: [logoAttachment()],
          ephemeral: true,
        });
      }
      await interaction.deferReply({ ephemeral: true });
      try {
        const player = await passeService.confirmPlayer(id, config);
        const embed = baseEmbed({ color: COLORS.accent })
          .setTitle(`${EMOJI.ticket || '🎟️'} Confirmar envio do passe`)
          .setDescription(`Confira os dados abaixo antes de autorizar o envio.\n\nPreço: **${centsToBRL(config.passe.priceCents)}**\nSaldo após a compra: **${centsToBRL(balanceCents - config.passe.priceCents)}**\n\nO valor só será reservado quando você confirmar.`)
          .addFields(
            { name: 'ID', value: `\`${player.id || id}\``, inline: true },
            { name: 'Nick', value: String(player.nickname || 'Não informado'), inline: true },
            { name: 'Nível', value: String(player.nivel ?? 'Não informado'), inline: true },
            { name: 'Região', value: String(player.regiao || 'BR'), inline: true }
          );
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`passe_confirm:${interaction.user.id}:${id}`)
            .setLabel('Sim, enviar passe')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`passe_cancel:${interaction.user.id}:${id}`)
            .setLabel('Cancelar')
            .setStyle(ButtonStyle.Secondary)
        );
        return interaction.editReply({ embeds: [embed], files: [logoAttachment()], components: [row] });
      } catch (err) {
        return interaction.editReply({ embeds: [errorEmbed(err.message)], files: [logoAttachment()] });
      }
    }

    const denied = adminOnly(interaction);
    if (denied) return denied;

    await interaction.deferReply({ ephemeral: true });
    try {
      if (subcommand === 'estoque') {
        const stock = await passeService.getStock(config);
        const embed = baseEmbed()
          .setTitle(`${EMOJI.package || '📦'} Estoque de passes`)
          .addFields(
            { name: 'Passes disponíveis', value: String(stock.passes_disponiveis ?? stock.estoque ?? 0), inline: true },
            { name: 'Contas adicionadas', value: String(stock.contas_adicionadas ?? 0), inline: true },
            { name: 'Passes enviados', value: String(stock.enviados ?? 0), inline: true }
          );
        return interaction.editReply({ embeds: [embed], files: [logoAttachment()] });
      }

      const days = await passeService.getDays(config);
      const remaining = days.ilimitada ? 'Ilimitada' : `${days.dias_restantes ?? 0} dia(s)`;
      const embed = baseEmbed()
        .setTitle(`${EMOJI.hourglass} Validade da API de passe`)
        .setDescription(`Dias restantes: **${remaining}**${days.expira ? `\nExpira em: <t:${Math.floor(new Date(days.expira).getTime() / 1000)}:F>` : ''}`);
      return interaction.editReply({ embeds: [embed], files: [logoAttachment()] });
    } catch (err) {
      return interaction.editReply({ embeds: [errorEmbed(err.message)], files: [logoAttachment()] });
    }
  },
};
