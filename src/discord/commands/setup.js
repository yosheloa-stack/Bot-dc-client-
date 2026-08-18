'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const guildSettingsRepository = require('../../repositories/guildSettingsRepository');
const { baseEmbed, logoAttachment, EMOJI, COLORS } = require('../embeds/theme');
const { isAdmin } = require('../permissions');
const { getConfig } = require('../../config/env');

/**
 * /setup — Configuração automática do servidor.
 *
 * É IDEMPOTENTE: reconhece canais/categorias que já existem (ignorando
 * emojis e símbolos no nome) e reaplica as permissões corretas neles, então
 * pode ser rodado quantas vezes quiser para "consertar" o servidor.
 *
 * Regras aplicadas por canal:
 *  - readonly : só a staff manda mensagem; o resto lê.
 *  - open     : todo mundo conversa normalmente.
 *  - staff    : só a staff vê o canal.
 */

const ROLES = [
  { name: 'Ceifador Admin', color: 0x8b0000, permissions: [PermissionFlagsBits.Administrator] },
  { name: 'Moderador', color: 0x2f2f2f, permissions: [PermissionFlagsBits.KickMembers, PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.ManageMessages] },
  { name: 'Membro', color: 0x57f287, permissions: [] },
  { name: 'Silenciado', color: 0x4f545c, permissions: [] },
];

const T = ChannelType.GuildText;
const V = ChannelType.GuildVoice;

const STRUCTURE = [
  {
    category: '📋・INFORMAÇÕES',
    catMatch: ['informacoes', 'servidor', 'info', 'inicio'],
    channels: [
      { name: '✅・verificação', match: ['verificacao', 'verify', 'verificar'], type: T, mode: 'readonly' },
      { name: '📜・regras', match: ['regras', 'rules', 'regra'], type: T, mode: 'readonly' },
      { name: '📢・avisos', match: ['avisos', 'aviso', 'anuncios', 'anuncio', 'announcements'], type: T, mode: 'readonly' },
      { name: '👋・bem-vindo', match: ['bemvindo', 'welcome', 'boasvindas'], type: T, mode: 'readonly' },
    ],
  },
  {
    category: '💬・COMUNIDADE',
    catMatch: ['comunidade', 'community'],
    channels: [
      { name: '💬・chat-geral', match: ['chatgeral', 'geral', 'general', 'chat', 'batepapo'], type: T, mode: 'open' },
      { name: '🖼️・mídia', match: ['midia', 'media', 'fotos'], type: T, mode: 'open' },
    ],
  },
  {
    category: '💠・CEIFADOR',
    catMatch: ['ceifador', 'financeiro', 'saldo'],
    channels: [
      { name: '💠・saldo-e-pix', match: ['saldoepix', 'saldo', 'pix', 'deposito'], type: T, mode: 'open' },
    ],
  },
  {
    category: '🔞・NSFW',
    catMatch: ['nsfw', 'adulto'],
    channels: [{ name: '🔞・conteúdo-adulto', match: ['conteudoadulto', 'nsfw', 'adulto'], type: T, nsfw: true, mode: 'open' }],
  },
  {
    category: '🔊・VOZ',
    catMatch: ['voz', 'voice', 'salasaberta', 'salas', 'call'],
    channels: [
      { name: '🔊 Geral', match: ['geralvoz', 'lobby', 'lobby1'], type: V, mode: 'voice' },
      { name: '🎵 Música', match: ['musica', 'music', 'music1'], type: V, mode: 'voice' },
    ],
  },
  {
    category: '🛡️・STAFF',
    catMatch: ['staff', 'equipe', 'moderacao'],
    staffOnly: true,
    channels: [
      { name: '📋・logs-ceifador', match: ['logsceifador', 'logs', 'log', 'registro'], type: T, isLog: true, mode: 'staff' },
      { name: '💬・sala-staff', match: ['salastaff', 'staffchat', 'chatstaff'], type: T, mode: 'staff' },
    ],
  },
];

const norm = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .split('')
    .filter((ch) => {
      const code = ch.codePointAt(0);
      return !(code >= 0x0300 && code <= 0x036f);
    })
    .join('')
    .replace(/[^a-z0-9]/g, '');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configura automaticamente cargos, canais e permissões do servidor (somente admin).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const config = getConfig();
    if (!isAdmin(interaction, config)) {
      return interaction.reply({ content: `${EMOJI.cross} Apenas administradores podem rodar /setup.`, ephemeral: true });
    }

    await interaction.reply({
      embeds: [baseEmbed().setTitle('⚙️ Configurando o servidor...').setDescription('Ajustando cargos, canais e permissões. Isso pode levar alguns segundos.')],
      files: [logoAttachment()],
      ephemeral: true,
    });

    const guild = interaction.guild;
    const everyone = guild.roles.everyone;

    await guild.channels.fetch().catch(() => null);
    await guild.roles.fetch().catch(() => null);

    const created = { roles: [], categories: [], channels: [] };
    const configured = [];

    const roleMap = {};
    for (const def of ROLES) {
      let role = guild.roles.cache.find((r) => r.name === def.name);
      if (!role) {
        role = await guild.roles.create({ name: def.name, color: def.color, permissions: def.permissions, reason: 'Setup do Ceifador' });
        created.roles.push(role.name);
      }
      roleMap[def.name] = role;
    }

    const staffIds = [roleMap['Ceifador Admin'].id, roleMap['Moderador'].id];

    const targetsFor = (mode) => {
      switch (mode) {
        case 'readonly':
          return [
            { id: everyone.id, options: { SendMessages: false, AddReactions: false, CreatePublicThreads: false, CreatePrivateThreads: false, SendMessagesInThreads: false } },
            ...staffIds.map((id) => ({ id, options: { ViewChannel: true, SendMessages: true, AddReactions: true } })),
          ];
        case 'open':
          return [{ id: everyone.id, options: { ViewChannel: true, SendMessages: true, AddReactions: true } }];
        case 'staff':
          return [
            { id: everyone.id, options: { ViewChannel: false } },
            ...staffIds.map((id) => ({ id, options: { ViewChannel: true, SendMessages: true } })),
          ];
        default:
          return [];
      }
    };

    const applyPerms = async (channel, targets) => {
      for (const t of targets) {
        await channel.permissionOverwrites.edit(t.id, t.options, { reason: 'Setup do Ceifador' }).catch(() => null);
      }
    };

    let logChannelId = null;

    for (const block of STRUCTURE) {
      const catSet = new Set([norm(block.category), ...(block.catMatch || [])]);
      let category = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && catSet.has(norm(c.name)));

      if (!category) {
        category = await guild.channels.create({ name: block.category, type: ChannelType.GuildCategory, reason: 'Setup do Ceifador' });
        created.categories.push(block.category);
      }

      if (block.staffOnly) {
        await applyPerms(category, [{ id: everyone.id, options: { ViewChannel: false } }, ...staffIds.map((id) => ({ id, options: { ViewChannel: true } }))]);
      }

      for (const ch of block.channels) {
        const chSet = new Set([norm(ch.name), ...(ch.match || [])]);
        let channel = guild.channels.cache.find((c) => c.type === ch.type && chSet.has(norm(c.name)));

        if (!channel) {
          channel = await guild.channels.create({ name: ch.name, type: ch.type, parent: category.id, nsfw: Boolean(ch.nsfw), reason: 'Setup do Ceifador' });
          created.channels.push(ch.name);
        } else {
          configured.push(channel.name);
        }

        await applyPerms(channel, targetsFor(ch.mode));
        if (ch.type === T && ch.nsfw && 'setNSFW' in channel) {
          await channel.setNSFW(true).catch(() => null);
        }

        if (ch.isLog) logChannelId = channel.id;
      }
    }

    guildSettingsRepository.updateSettings(guild.id, { logChannelId, mutedRoleId: roleMap['Silenciado'].id });

    const mutedRole = roleMap['Silenciado'];
    for (const channel of guild.channels.cache.values()) {
      if (channel.type === T || channel.type === V) {
        await channel.permissionOverwrites.edit(mutedRole, { SendMessages: false, AddReactions: false, Speak: false }).catch(() => null);
      }
    }

    const summary = baseEmbed({ color: COLORS.success })
      .setTitle('Servidor configurado!')
      .setDescription(
        [
          `**Cargos criados:** ${created.roles.length ? created.roles.join(', ') : 'nenhum (já existiam)'}`,
          `**Canais criados:** ${created.channels.length}`,
          `**Canais já existentes reconfigurados:** ${configured.length}`,
          logChannelId ? `**Canal de logs:** <#${logChannelId}>` : '',
          '',
          'Pode rodar `/setup` de novo a qualquer momento para reaplicar as permissões.',
          'Use `/admin moderacao` para ajustar anti-link, anti-spam, anti-NSFW e avisos.',
        ]
          .filter(Boolean)
          .join('\n')
      );

    await interaction.followUp({ embeds: [summary], files: [logoAttachment()], ephemeral: true });
  },
};
