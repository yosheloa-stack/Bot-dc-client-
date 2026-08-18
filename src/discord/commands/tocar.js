'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, logoAttachment, COLORS } = require('../embeds/theme');
const music = require('../../music/manager');

/** /tocar — Toca uma música ou playlist no canal de voz (YouTube por nome ou link). */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('tocar')
    .setDescription('Toca uma música ou playlist no canal de voz.')
    .addStringOption((opt) => opt.setName('musica').setDescription('Nome, link do YouTube ou link de playlist').setRequired(true)),

  async execute(interaction) {
    const voiceChannel = interaction.member.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({
        embeds: [baseEmbed({ color: COLORS.danger }).setTitle('Entre numa call').setDescription('Você precisa estar em um canal de voz para usar isso.')],
        files: [logoAttachment()],
        ephemeral: true,
      });
    }

    const perms = voiceChannel.permissionsFor(interaction.guild.members.me);
    if (!perms?.has('Connect') || !perms?.has('Speak')) {
      return interaction.reply({
        embeds: [baseEmbed({ color: COLORS.danger }).setTitle('Sem permissão').setDescription('Não tenho permissão para conectar/falar nesse canal de voz.')],
        files: [logoAttachment()],
        ephemeral: true,
      });
    }

    const existing = music.getPlayer(interaction.guild);
    if (existing && existing.voiceChannelId && existing.voiceChannelId !== voiceChannel.id) {
      return interaction.reply({
        embeds: [
          baseEmbed({ color: COLORS.accent })
            .setTitle('Já estou ocupado')
            .setDescription(`Já estou tocando na call <#${existing.voiceChannelId}>. Espere terminar ou entre nessa call — só consigo tocar em uma de cada vez.`),
        ],
        files: [logoAttachment()],
        ephemeral: true,
      });
    }

    const query = interaction.options.getString('musica', true);
    await interaction.deferReply({ ephemeral: true });

    const { tracks, playlistTitle } = await music.resolve(query, `${interaction.user}`);
    if (!tracks.length) {
      return interaction.editReply({
        embeds: [baseEmbed({ color: COLORS.danger }).setTitle('Nada encontrado').setDescription('Não achei nenhuma música/playlist com esse nome ou link.')],
        files: [logoAttachment()],
      });
    }

    const player = music.getOrCreatePlayer(interaction.guild, interaction.channel);

    try {
      await player.connect(voiceChannel);
    } catch (err) {
      return interaction.editReply({ embeds: [baseEmbed({ color: COLORS.danger }).setTitle('Erro').setDescription(err.message)], files: [logoAttachment()] });
    }

    const willPlayNow = !player.current;
    for (const t of tracks) player.add(t);

    await player.start();

    if (playlistTitle) {
      await interaction.editReply({
        embeds: [baseEmbed({ color: COLORS.success }).setTitle('Playlist adicionada').setDescription(`**${tracks.length}** músicas na fila.`)],
        files: [logoAttachment()],
      });
      const embed = baseEmbed().setTitle('🎶 Playlist adicionada').setDescription(`**${playlistTitle}**\n**${tracks.length}** músicas adicionadas à fila.`);
      if (tracks[0]?.thumbnail) embed.setThumbnail(tracks[0].thumbnail);
      interaction.channel.send({ embeds: [embed] }).catch(() => null);
      return;
    }

    const track = tracks[0];
    const position = player.queue.length;
    if (willPlayNow) {
      await interaction.editReply({
        embeds: [baseEmbed({ color: COLORS.success }).setTitle('Tocando').setDescription(`▶️ **${track.title}**`)],
        files: [logoAttachment()],
      });
    } else {
      await interaction.editReply({
        embeds: [baseEmbed({ color: COLORS.success }).setTitle('Na fila').setDescription(`Adicionada na posição #${position}.`)],
        files: [logoAttachment()],
      });
      const embed = baseEmbed({ withThumbnail: false })
        .setTitle('🎵 Adicionada à fila')
        .setDescription(`#${position} • **${track.title}**`)
        .addFields({ name: 'Duração', value: track.durationRaw || '—', inline: true });
      if (track.thumbnail) embed.setThumbnail(track.thumbnail);
      interaction.channel.send({ embeds: [embed] }).catch(() => null);
    }
  },
};
