'use strict';

const music = require('./manager');
const { baseEmbed, logoAttachment, EMOJI, COLORS } = require('../discord/embeds/theme');

/** Trata os cliques nos botões do painel de música (customId "music:<ação>"). */
async function handleButton(interaction) {
  const action = interaction.customId.split(':')[1];
  const player = music.getPlayer(interaction.guild);

  if (!player || !player.current) {
    const encerrada = {
      embeds: [baseEmbed({ color: COLORS.accent }).setTitle('Música encerrada').setDescription('Essa sessão já acabou. Use `/tocar` para começar de novo.')],
      components: [],
    };
    try {
      return await interaction.update(encerrada);
    } catch {
      return interaction.reply({ ...encerrada, files: [logoAttachment()], ephemeral: true }).catch(() => null);
    }
  }

  const userVoice = interaction.member?.voice?.channelId;
  if (userVoice !== player.voiceChannelId) {
    return interaction.reply({
      embeds: [baseEmbed({ color: COLORS.accent }).setTitle('Entre na call').setDescription('Você precisa estar na mesma call do bot para controlar a música.')],
      files: [logoAttachment()],
      ephemeral: true,
    });
  }

  try {
    switch (action) {
      case 'pause':
        player.togglePause();
        return interaction.update(player.renderPanel());

      case 'up':
        player.volumeUp();
        return interaction.update(player.renderPanel());

      case 'down':
        player.volumeDown();
        return interaction.update(player.renderPanel());

      case 'loop':
        player.toggleLoop();
        return interaction.update(player.renderPanel());

      case 'autoplay':
        player.toggleAutoplay();
        return interaction.update(player.renderPanel());

      case 'shuffle':
        player.shuffle();
        return interaction.update(player.renderPanel());

      case 'skip':
        await interaction.deferUpdate();
        player.skip();
        return;

      case 'back': {
        await interaction.deferUpdate();
        const ok = player.back();
        if (!ok) {
          await interaction
            .followUp({
              embeds: [baseEmbed({ color: COLORS.accent }).setTitle('Sem histórico').setDescription('Não há música anterior para voltar.')],
              files: [logoAttachment()],
              ephemeral: true,
            })
            .catch(() => null);
        }
        return;
      }

      case 'stop':
        await interaction.reply({
          embeds: [baseEmbed({ color: COLORS.success }).setTitle('Parado').setDescription('⏹️ Música parada e fila limpa. Saindo da call.')],
          files: [logoAttachment()],
          ephemeral: true,
        });
        player.stop();
        return;

      case 'playlist': {
        const linhas = [`▶️ **Tocando:** ${player.current.title}`];
        if (player.queue.length) {
          linhas.push('', '**Próximas:**', player.queue.slice(0, 10).map((t, i) => `\`${i + 1}.\` ${t.title}`).join('\n'));
          if (player.queue.length > 10) linhas.push(`… e mais ${player.queue.length - 10}.`);
        } else {
          linhas.push('', '_Fila vazia._');
        }
        return interaction.reply({
          embeds: [baseEmbed().setTitle('🎶 Playlist').setDescription(linhas.join('\n'))],
          files: [logoAttachment()],
          ephemeral: true,
        });
      }

      default:
        return interaction.deferUpdate().catch(() => null);
    }
  } catch (err) {
    console.error(`${EMOJI.cross} [music] Erro no botão de música:`, err.message);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.deferUpdate().catch(() => null);
    }
  }
}

module.exports = { handleButton };
