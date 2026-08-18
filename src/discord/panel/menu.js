'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
} = require('discord.js');
const { baseEmbed, logoAttachment, EMOJI, COLORS } = require('../embeds/theme');
const { isAdmin } = require('../permissions');
const { getConfig } = require('../../config/env');

/**
 * Painel de comandos por BOTÃO e MODAL.
 *
 * Em vez de digitar cada slash command, o servidor posta um único painel
 * (comando /painel). Cada botão executa o comando correspondente:
 *   - comandos sem argumentos rodam na hora;
 *   - comandos que precisam de dados (tocar, marcar, avisos) abrem um MODAL
 *     e reaproveitam a mesma lógica dos slash commands já existentes.
 *
 * customId: Botão "menu:<acao>" · Modal "menu:modal:<acao>"
 */

const PREFIX = 'menu:';

function buildPanelMessage() {
  const embed = baseEmbed()
    .setTitle('🎛️ Painel de Comandos — Ceifador')
    .setDescription(
      'Controle o bot pelos **botões** abaixo. Os comandos que precisam de ' +
        'informações (música, marcação e avisos) abrem uma **janela** para você preencher.'
    )
    .addFields(
      { name: '💠 Saldo e Pix', value: 'Consultar saldo.' },
      { name: '🎵 Música', value: 'Tocar, Pular, Pausar, Retomar, Parar e Fila.' },
      { name: '📢 Utilidades', value: 'Marcar todo mundo, Ping e Ajuda.' },
      { name: '🛡️ Moderação', value: 'Avisar, ver e limpar avisos (só staff).' },
      { name: '⚙️ Administração', value: 'Setup e configuração de moderação (só admin).' }
    );

  const btn = (id, label, style, emoji) => new ButtonBuilder().setCustomId(PREFIX + id).setLabel(label).setStyle(style).setEmoji(emoji);

  const rowMusica = new ActionRowBuilder().addComponents(
    btn('tocar', 'Tocar', ButtonStyle.Primary, '🎵'),
    btn('pular', 'Pular', ButtonStyle.Secondary, '⏭️'),
    btn('pausar', 'Pausar', ButtonStyle.Secondary, '⏸️'),
    btn('retomar', 'Retomar', ButtonStyle.Secondary, '▶️'),
    btn('parar', 'Parar', ButtonStyle.Danger, '⏹️')
  );

  const rowUtil = new ActionRowBuilder().addComponents(
    btn('fila', 'Fila', ButtonStyle.Secondary, '🎶'),
    btn('saldo', 'Saldo', ButtonStyle.Success, '💠'),
    btn('marcar', 'Marcar', ButtonStyle.Primary, '📢'),
    btn('ping', 'Ping', ButtonStyle.Secondary, '🏓'),
    btn('ajuda', 'Ajuda', ButtonStyle.Secondary, '❓')
  );

  const rowMod = new ActionRowBuilder().addComponents(
    btn('avisar', 'Avisar', ButtonStyle.Danger, '⚠️'),
    btn('veravisos', 'Ver avisos', ButtonStyle.Secondary, '📋'),
    btn('limparavisos', 'Limpar avisos', ButtonStyle.Secondary, '🧹')
  );

  const rowAdmin = new ActionRowBuilder().addComponents(
    btn('setup', 'Setup', ButtonStyle.Secondary, '⚙️'),
    btn('configver', 'Config', ButtonStyle.Secondary, '🛠️')
  );

  return { embeds: [embed], components: [rowMusica, rowUtil, rowMod, rowAdmin], files: [logoAttachment()] };
}

// ---------------------------------------------------------------------------
// Permissões
// ---------------------------------------------------------------------------

function hasPerm(interaction, config, flag) {
  return isAdmin(interaction, config) || Boolean(interaction.memberPermissions?.has(flag));
}

function deny(interaction, msg = 'Você não tem permissão para usar isto.') {
  return interaction.reply({
    embeds: [baseEmbed({ color: COLORS.danger }).setTitle(`${EMOJI.cross} Sem permissão`).setDescription(msg)],
    files: [logoAttachment()],
    ephemeral: true,
  });
}

// ---------------------------------------------------------------------------
// Adaptador: roda um slash command já existente a partir de um modal/botão
// ---------------------------------------------------------------------------

function withOptions(interaction, { commandName, subcommand = null, subcommandGroup = null, strings = {}, booleans = {}, users = {}, channels = {} }) {
  const options = {
    getSubcommand: () => subcommand,
    getSubcommandGroup: () => subcommandGroup,
    getString: (name) => (name in strings ? strings[name] : null),
    getBoolean: (name) => (name in booleans ? booleans[name] : null),
    getUser: (name) => (name in users ? users[name] : null),
    getChannel: (name) => (name in channels ? channels[name] : null),
    getMember: () => null,
    getInteger: () => null,
    getNumber: () => null,
  };
  return new Proxy(interaction, {
    get(target, prop) {
      if (prop === 'options') return options;
      if (prop === 'commandName') return commandName;
      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

async function runCommand(interaction, client, commandName, opts = {}) {
  const command = client.commands.get(commandName);
  if (!command) {
    return interaction.reply({
      embeds: [baseEmbed({ color: COLORS.danger }).setTitle('Indisponível').setDescription('Esse comando não está carregado.')],
      files: [logoAttachment()],
      ephemeral: true,
    });
  }
  const proxy = withOptions(interaction, { commandName, ...opts });
  try {
    await command.execute(proxy);
  } catch (err) {
    console.error(`[panel] Erro no painel (${commandName}):`, err.message);
    const payload = {
      embeds: [baseEmbed({ color: COLORS.danger }).setTitle('Ops!').setDescription('Ocorreu um erro ao executar essa ação.')],
      files: [logoAttachment()],
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => null);
    } else {
      await interaction.reply(payload).catch(() => null);
    }
  }
}

async function resolveUser(interaction, raw) {
  const id = (raw || '').match(/\d{5,}/)?.[0];
  if (!id) return null;
  const member = await interaction.guild.members.fetch(id).catch(() => null);
  if (member) return member.user;
  return interaction.client.users.fetch(id).catch(() => null);
}

// ---------------------------------------------------------------------------
// Modais
// ---------------------------------------------------------------------------

function textRow(id, label, { style = TextInputStyle.Short, required = true, placeholder, maxLength } = {}) {
  const input = new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setRequired(required);
  if (placeholder) input.setPlaceholder(placeholder);
  if (maxLength) input.setMaxLength(maxLength);
  return new ActionRowBuilder().addComponents(input);
}

function buildModal(action) {
  switch (action) {
    case 'tocar':
      return new ModalBuilder()
        .setCustomId(`${PREFIX}modal:tocar`)
        .setTitle('🎵 Tocar música')
        .addComponents(textRow('musica', 'Nome ou link do YouTube', { placeholder: 'Ex.: Imagine Dragons - Believer', maxLength: 300 }));
    case 'marcar':
      return new ModalBuilder()
        .setCustomId(`${PREFIX}modal:marcar`)
        .setTitle('📢 Marcar todo mundo')
        .addComponents(
          textRow('mensagem', 'Mensagem (opcional)', { style: TextInputStyle.Paragraph, required: false, placeholder: 'Texto que acompanha a marcação', maxLength: 1000 }),
          textRow('aqui', 'Só quem está online?', { required: false, placeholder: 'Digite "sim" para @here (padrão: @everyone)', maxLength: 5 })
        );
    case 'avisar':
      return new ModalBuilder()
        .setCustomId(`${PREFIX}modal:avisar`)
        .setTitle('⚠️ Adicionar aviso')
        .addComponents(
          textRow('membro', 'Membro (ID ou @menção)', { placeholder: 'Ex.: 123456789012345678', maxLength: 40 }),
          textRow('motivo', 'Motivo do aviso', { placeholder: 'Ex.: flood no chat', maxLength: 300 })
        );
    case 'veravisos':
      return new ModalBuilder().setCustomId(`${PREFIX}modal:veravisos`).setTitle('📋 Ver avisos').addComponents(textRow('membro', 'Membro (ID ou @menção)', { placeholder: 'Ex.: 123456789012345678', maxLength: 40 }));
    case 'limparavisos':
      return new ModalBuilder()
        .setCustomId(`${PREFIX}modal:limparavisos`)
        .setTitle('🧹 Limpar avisos')
        .addComponents(textRow('membro', 'Membro (ID ou @menção)', { placeholder: 'Ex.: 123456789012345678', maxLength: 40 }));
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Roteamento dos botões
// ---------------------------------------------------------------------------

const DIRECT = new Set(['saldo', 'ping', 'ajuda', 'fila', 'pular', 'pausar', 'retomar', 'parar', 'setup']);
const MODALS = new Set(['tocar', 'marcar', 'avisar', 'veravisos', 'limparavisos']);

async function handleButton(interaction, client) {
  const action = interaction.customId.slice(PREFIX.length);
  const config = getConfig();

  if (action === 'setup' || action === 'configver') {
    if (!isAdmin(interaction, config)) return deny(interaction, 'Apenas administradores podem usar isto.');
  }
  if (action === 'marcar' && !hasPerm(interaction, config, PermissionFlagsBits.MentionEveryone)) {
    return deny(interaction, 'Você precisa da permissão de **Marcar @everyone**.');
  }
  if ((action === 'avisar' || action === 'veravisos' || action === 'limparavisos') && !hasPerm(interaction, config, PermissionFlagsBits.ModerateMembers)) {
    return deny(interaction, 'Apenas a staff (moderar membros) pode usar isto.');
  }

  if (action === 'configver') {
    return runCommand(interaction, client, 'admin', { subcommandGroup: 'moderacao', subcommand: 'ver' });
  }
  if (DIRECT.has(action)) {
    return runCommand(interaction, client, action);
  }
  if (MODALS.has(action)) {
    const modal = buildModal(action);
    if (modal) return interaction.showModal(modal);
  }

  return interaction
    .reply({
      embeds: [baseEmbed({ color: COLORS.accent }).setTitle('Ação desconhecida').setDescription('Esse botão não faz nada por aqui.')],
      files: [logoAttachment()],
      ephemeral: true,
    })
    .catch(() => null);
}

// ---------------------------------------------------------------------------
// Roteamento dos modais
// ---------------------------------------------------------------------------

async function handleModal(interaction, client) {
  const action = interaction.customId.slice(`${PREFIX}modal:`.length);
  const field = (id) => interaction.fields.getTextInputValue(id).trim();

  switch (action) {
    case 'tocar':
      return runCommand(interaction, client, 'tocar', { strings: { musica: field('musica') } });

    case 'marcar': {
      const aqui = /^(sim|s|here|aqui|yes|y|true)$/i.test(field('aqui'));
      return runCommand(interaction, client, 'marcar', { strings: { mensagem: field('mensagem') }, booleans: { aqui } });
    }

    case 'avisar':
    case 'veravisos':
    case 'limparavisos': {
      const user = await resolveUser(interaction, field('membro'));
      if (!user) {
        return interaction.reply({
          embeds: [baseEmbed({ color: COLORS.danger }).setTitle('Membro não encontrado').setDescription('Confira o ID ou a menção e tente de novo.')],
          files: [logoAttachment()],
          ephemeral: true,
        });
      }
      const sub = action === 'avisar' ? 'add' : action === 'veravisos' ? 'ver' : 'limpar';
      const strings = action === 'avisar' ? { motivo: field('motivo') } : {};
      return runCommand(interaction, client, 'avisos', { subcommand: sub, users: { membro: user }, strings });
    }

    default:
      return interaction
        .reply({
          embeds: [baseEmbed({ color: COLORS.accent }).setTitle('Ação desconhecida').setDescription('Não sei o que fazer com esse formulário.')],
          files: [logoAttachment()],
          ephemeral: true,
        })
        .catch(() => null);
  }
}

module.exports = { PREFIX, buildPanelMessage, handleButton, handleModal };
