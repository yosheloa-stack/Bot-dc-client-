'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const settingsRepository = require('../../repositories/settingsRepository');
const transactionRepository = require('../../repositories/transactionRepository');
const balanceService = require('../../services/balanceService');
const { getConfig } = require('../../config/env');
const { isAdmin } = require('../permissions');
const { baseEmbed, logoAttachment, EMOJI, COLORS } = require('../embeds/theme');
const { centsToBRL, reaisToCents, formatDate } = require('../../utils/format');
const { notifyWithdrawResolved } = require('../notifier');

function maskKey(key) {
  if (!key) return '_não configurada_';
  if (key.length <= 6) return '••••••';
  return `${key.slice(0, 3)}••••${key.slice(-3)}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Comandos administrativos do Ceifador.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommandGroup((group) =>
      group
        .setName('saldo')
        .setDescription('Ajustar saldo de usuários')
        .addSubcommand((sub) =>
          sub
            .setName('adicionar')
            .setDescription('Adiciona saldo a um usuário')
            .addUserOption((o) => o.setName('usuario').setDescription('Usuário alvo').setRequired(true))
            .addNumberOption((o) => o.setName('valor').setDescription('Valor em reais').setRequired(true).setMinValue(0.01))
            .addStringOption((o) => o.setName('motivo').setDescription('Motivo do ajuste').setRequired(false))
        )
        .addSubcommand((sub) =>
          sub
            .setName('remover')
            .setDescription('Remove saldo de um usuário')
            .addUserOption((o) => o.setName('usuario').setDescription('Usuário alvo').setRequired(true))
            .addNumberOption((o) => o.setName('valor').setDescription('Valor em reais').setRequired(true).setMinValue(0.01))
            .addStringOption((o) => o.setName('motivo').setDescription('Motivo do ajuste').setRequired(false))
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('pix')
        .setDescription('Configurações de Pix')
        .addSubcommand((sub) =>
          sub
            .setName('chave')
            .setDescription('Define a chave Pix usada no modo manual')
            .addStringOption((o) => o.setName('valor').setDescription('Chave Pix').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('provedor')
            .setDescription('Define o provedor de Pix')
            .addStringOption((o) =>
              o
                .setName('valor')
                .setDescription('Provedor')
                .setRequired(true)
                .addChoices(
                  { name: 'Manual (chave Pix estática)', value: 'manual' },
                  { name: 'Mercado Pago (automático)', value: 'mercadopago' },
                  { name: 'Efí Bank (automático)', value: 'efi' }
                )
            )
        )
        .addSubcommand((sub) => sub.setName('ver').setDescription('Mostra a configuração atual de Pix'))
    )
    .addSubcommandGroup((group) =>
      group
        .setName('saques')
        .setDescription('Gerenciar solicitações de retirada')
        .addSubcommand((sub) => sub.setName('listar').setDescription('Lista retiradas pendentes'))
        .addSubcommand((sub) =>
          sub
            .setName('concluir')
            .setDescription('Marca uma retirada como paga')
            .addStringOption((o) => o.setName('id').setDescription('ID da transação').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('cancelar')
            .setDescription('Cancela uma retirada e devolve o saldo')
            .addStringOption((o) => o.setName('id').setDescription('ID da transação').setRequired(true))
        )
    )
    .addSubcommand((sub) => sub.setName('painel').setDescription('Mostra o link do painel administrativo web')),

  async execute(interaction) {
    const config = getConfig();
    if (!isAdmin(interaction, config)) {
      return interaction.reply({
        content: `${EMOJI.cross} Você não tem permissão para usar este comando.`,
        ephemeral: true,
      });
    }

    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    if (!group && sub === 'painel') {
      const embed = baseEmbed()
        .setTitle(`${EMOJI.scythe} Painel Administrativo`)
        .setDescription(`Acesse: ${config.web.publicUrl}\n\nUse as credenciais definidas em \`ADMIN_PANEL_USER\` / \`ADMIN_PANEL_PASSWORD\`.`);
      return interaction.reply({ embeds: [embed], files: [logoAttachment()], ephemeral: true });
    }

    if (group === 'saldo') {
      return handleSaldo(interaction, sub);
    }
    if (group === 'pix') {
      return handlePix(interaction, sub, config);
    }
    if (group === 'saques') {
      return handleSaques(interaction, sub);
    }

    return interaction.reply({ content: `${EMOJI.cross} Subcomando desconhecido.`, ephemeral: true });
  },
};

async function handleSaldo(interaction, sub) {
  const targetUser = interaction.options.getUser('usuario', true);
  const amountCents = reaisToCents(interaction.options.getNumber('valor', true));
  const motivo = interaction.options.getString('motivo') || null;
  const delta = sub === 'remover' ? -amountCents : amountCents;

  try {
    balanceService.adminAdjust({
      discordId: targetUser.id,
      username: targetUser.username,
      amountCents: delta,
      actor: interaction.user.id,
      description: motivo,
    });
  } catch (err) {
    const embed = baseEmbed({ color: COLORS.danger }).setTitle(`${EMOJI.cross} Falha no ajuste`).setDescription(err.message);
    return interaction.reply({ embeds: [embed], files: [logoAttachment()], ephemeral: true });
  }

  const newBalance = balanceService.getBalance(targetUser.id, targetUser.username);
  const embed = baseEmbed({ color: COLORS.success })
    .setTitle(`${EMOJI.check} Saldo ${sub === 'remover' ? 'removido' : 'adicionado'}`)
    .setDescription(
      `${sub === 'remover' ? '-' : '+'}${centsToBRL(amountCents)} para <@${targetUser.id}>\nNovo saldo: **${centsToBRL(newBalance)}**`
    );
  await interaction.reply({ embeds: [embed], files: [logoAttachment()], ephemeral: true });
}

async function handlePix(interaction, sub, config) {
  if (sub === 'chave') {
    const valor = interaction.options.getString('valor', true).trim();
    settingsRepository.set('pix_key', valor);
    const embed = baseEmbed({ color: COLORS.success })
      .setTitle(`${EMOJI.pix} Chave Pix atualizada`)
      .setDescription(`Nova chave: \`${maskKey(valor)}\``);
    return interaction.reply({ embeds: [embed], files: [logoAttachment()], ephemeral: true });
  }

  if (sub === 'provedor') {
    const valor = interaction.options.getString('valor', true);
    settingsRepository.set('pix_provider', valor);
    const embed = baseEmbed({ color: COLORS.success })
      .setTitle(`${EMOJI.pix} Provedor de Pix atualizado`)
      .setDescription(`Provedor ativo: **${valor}**`);
    return interaction.reply({ embeds: [embed], files: [logoAttachment()], ephemeral: true });
  }

  if (sub === 'ver') {
    const embed = baseEmbed()
      .setTitle(`${EMOJI.pix} Configuração de Pix`)
      .addFields(
        { name: 'Provedor', value: config.pix.provider, inline: true },
        { name: 'Chave Pix', value: maskKey(config.pix.key), inline: true },
        { name: 'Mercado Pago', value: config.pix.mercadoPago.accessToken ? 'Token configurado ✅' : 'Token não configurado ❌', inline: true },
        {
          name: 'Efí Bank',
          value:
            config.pix.efi.clientId && config.pix.efi.certPath
              ? `Configurada ✅ (${config.pix.efi.sandbox ? 'sandbox' : 'produção'})`
              : 'Não configurada ❌',
          inline: true,
        },
        { name: 'Depósito mínimo', value: centsToBRL(config.pix.minDepositCents), inline: true },
        { name: 'Depósito máximo', value: centsToBRL(config.pix.maxDepositCents), inline: true }
      );
    return interaction.reply({ embeds: [embed], files: [logoAttachment()], ephemeral: true });
  }
}

async function handleSaques(interaction, sub) {
  if (sub === 'listar') {
    const pending = transactionRepository.listAll({ status: 'pending', type: 'withdraw', limit: 10 });
    const embed = baseEmbed().setTitle(`${EMOJI.hourglass} Retiradas pendentes`);
    if (pending.length === 0) {
      embed.setDescription('Nenhuma retirada pendente.');
    } else {
      embed.setDescription(
        pending
          .map(
            (tx) =>
              `**ID:** \`${tx.id}\`\n<@${tx.discord_id}> — ${centsToBRL(tx.amount_cents)} — ${formatDate(tx.created_at)}\n${tx.description || ''}`
          )
          .join('\n\n')
      );
    }
    return interaction.reply({ embeds: [embed], files: [logoAttachment()], ephemeral: true });
  }

  const id = interaction.options.getString('id', true).trim();
  const tx = transactionRepository.getTransaction(id);
  if (!tx || tx.type !== 'withdraw') {
    return interaction.reply({ content: `${EMOJI.cross} Retirada não encontrada.`, ephemeral: true });
  }
  if (tx.status !== 'pending') {
    return interaction.reply({ content: `${EMOJI.cross} Esta retirada já foi ${tx.status === 'completed' ? 'concluída' : 'processada'}.`, ephemeral: true });
  }

  const updated = sub === 'concluir'
    ? balanceService.completeWithdraw(id, interaction.user.id)
    : balanceService.cancelWithdraw(id, interaction.user.id);

  await notifyWithdrawResolved(tx.discord_id, updated);

  const embed = baseEmbed({ color: sub === 'concluir' ? COLORS.success : COLORS.danger })
    .setTitle(sub === 'concluir' ? `${EMOJI.check} Retirada concluída` : `${EMOJI.cross} Retirada cancelada`)
    .setDescription(`Transação \`${id}\` de <@${tx.discord_id}> — ${centsToBRL(tx.amount_cents)}`);
  await interaction.reply({ embeds: [embed], files: [logoAttachment()], ephemeral: true });
}
