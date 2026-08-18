'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const guildSettingsRepository = require('../../repositories/guildSettingsRepository');
const modActions = require('../../moderation/modActions');
const { baseEmbed, logoAttachment, EMOJI, COLORS } = require('../embeds/theme');
const { formatDate } = require('../../utils/format');

/** /avisos — Gerencia os avisos (warns) dos membros. Restrito a moderadores. */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('avisos')
    .setDescription('Gerencia os avisos dos membros.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) =>
      s
        .setName('add')
        .setDescription('Adiciona um aviso a um membro.')
        .addUserOption((o) => o.setName('membro').setDescription('Quem receberá o aviso').setRequired(true))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo do aviso').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('ver')
        .setDescription('Mostra os avisos de um membro.')
        .addUserOption((o) => o.setName('membro').setDescription('Membro a consultar').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('limpar')
        .setDescription('Remove todos os avisos de um membro.')
        .addUserOption((o) => o.setName('membro').setDescription('Membro a limpar').setRequired(true))
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser('membro', true);

    if (sub === 'add') {
      const motivo = interaction.options.getString('motivo', true);
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        return interaction.reply({
          embeds: [baseEmbed({ color: COLORS.danger }).setTitle(`${EMOJI.cross} Erro`).setDescription('Membro não encontrado.')],
          files: [logoAttachment()],
          ephemeral: true,
        });
      }
      await modActions.apply({ member, action: 'warn', reason: `${motivo} (por ${interaction.user.tag})`, deleteMessage: false });
      const total = guildSettingsRepository.getWarnings(guildId, user.id).length;
      return interaction.reply({
        embeds: [baseEmbed({ color: COLORS.accent }).setTitle('⚠️ Aviso registrado').setDescription(`**${user.tag}** agora tem **${total}** aviso(s).`)],
        files: [logoAttachment()],
        ephemeral: true,
      });
    }

    if (sub === 'ver') {
      const list = guildSettingsRepository.getWarnings(guildId, user.id);
      const embed = baseEmbed();
      if (list.length === 0) {
        embed.setTitle('Sem avisos').setDescription(`**${user.tag}** não tem avisos.`);
      } else {
        embed
          .setTitle(`Avisos de ${user.tag} (${list.length})`)
          .setDescription(list.map((w, i) => `**${i + 1}.** ${w.reason}\n${formatDate(w.created_at)}`).join('\n\n'));
      }
      return interaction.reply({ embeds: [embed], files: [logoAttachment()], ephemeral: true });
    }

    if (sub === 'limpar') {
      guildSettingsRepository.clearWarnings(guildId, user.id);
      return interaction.reply({
        embeds: [baseEmbed({ color: COLORS.success }).setTitle(`${EMOJI.check} Avisos limpos`).setDescription(`Todos os avisos de **${user.tag}** foram removidos.`)],
        files: [logoAttachment()],
        ephemeral: true,
      });
    }
  },
};
