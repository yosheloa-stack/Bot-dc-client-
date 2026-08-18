'use strict';

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior,
} = require('@discordjs/voice');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const play = require('play-dl');
const ytApi = require('./ytApi');
const { baseEmbed, EMOJI } = require('../discord/embeds/theme');

/**
 * Player de música de UM servidor: conexão de voz, fila, histórico e o
 * painel de música com botões (pause, skip, back, volume, loop, shuffle,
 * autoplay, stop, playlist).
 */
class GuildPlayer {
  constructor(guild, textChannel) {
    this.guild = guild;
    this.textChannel = textChannel;
    this.queue = [];
    this.history = [];
    this.current = null;
    this.connection = null;
    this.voiceChannelId = null;
    this.currentResource = null;
    this.panelMessage = null;

    this.loop = false;
    this.autoplay = false;
    this.volume = 1.0;
    this.consecutiveFailures = 0;

    this.player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });
    this.leaveTimeout = null;

    this.player.on(AudioPlayerStatus.Idle, () => this.playNext());
    this.player.on('error', (err) => {
      if (/terminated/i.test(err.message || '')) {
        console.warn('[music] Stream de áudio caiu (recuperando):', err.message);
      } else {
        console.error('[music] Erro no player de música:', err.message);
      }
      this.playNext();
    });
  }

  // ---------------------------------------------------------------- conexão
  async connect(voiceChannel) {
    if (this.connection) return;
    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: this.guild.id,
      adapterCreator: this.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    this.voiceChannelId = voiceChannel.id;
    this.connection.subscribe(this.player);

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
    } catch {
      this.destroy();
      throw new Error('Não consegui entrar no canal de voz.');
    }

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        this.destroy();
      }
    });
  }

  // ------------------------------------------------------------------- fila
  add(track) {
    this.queue.push(track);
  }

  async start() {
    if (this.current) return;
    await this.playNext();
  }

  async playNext() {
    const finished = this.current;
    this.current = null;

    let track;
    if (this.loop && finished) {
      track = finished;
    } else {
      if (finished) {
        this.history.push(finished);
        if (this.history.length > 50) this.history.shift();
      }
      track = this.queue.shift();
      if (!track && this.autoplay && finished) {
        track = await this.getRelated(finished);
      }
    }

    if (!track) {
      await this.removePanel();
      this.scheduleLeave();
      return;
    }
    this.clearLeave();

    try {
      let source;
      if (ytApi.isConfigured()) {
        try {
          source = await ytApi.getStream(track.url);
        } catch (apiErr) {
          console.warn(`[music] API de áudio falhou (${apiErr.message}); tentando play-dl...`);
          source = await play.stream(track.url);
        }
      } else {
        source = await play.stream(track.url);
      }

      const resource = createAudioResource(source.stream, {
        inputType: source.type,
        inlineVolume: true,
      });
      resource.volume?.setVolume(this.volume);
      this.currentResource = resource;
      this.player.play(resource);
      this.current = track;
      this.consecutiveFailures = 0;
      await this.showPanel();
    } catch (err) {
      console.error('[music] Falha ao tocar faixa:', err.message);
      this.consecutiveFailures += 1;

      if (this.consecutiveFailures <= 2) {
        this.textChannel
          ?.send({ embeds: [baseEmbed({ color: 0xe74c3c }).setTitle(`${EMOJI.cross} Erro na música`).setDescription(`Não consegui tocar **${track.title}**. Pulando...`)] })
          .catch(() => null);
      }

      if (this.consecutiveFailures >= 8) {
        this.textChannel
          ?.send({
            embeds: [
              baseEmbed({ color: 0xe74c3c })
                .setTitle('Música pausada')
                .setDescription('Várias músicas seguidas falharam. A fonte de áudio parece instável — tente de novo mais tarde.'),
            ],
          })
          .catch(() => null);
        this.stop();
        return;
      }

      await new Promise((r) => setTimeout(r, 1200));
      this.playNext();
    }
  }

  /** Busca uma música parecida para o AutoPlay. */
  async getRelated(track) {
    try {
      const base = track.author && track.author !== '—' ? track.author : track.title;
      const results = await play.search(base, { limit: 15, source: { youtube: 'video' } }).catch(() => []);
      const played = new Set([track.url, ...this.history.map((h) => h.url)]);
      const candidatos = results.filter((v) => v?.url && !played.has(v.url));
      const escolhido = candidatos[Math.floor(Math.random() * candidatos.length)];
      if (escolhido?.url) {
        return {
          title: escolhido.title || 'Sem título',
          url: escolhido.url,
          durationRaw: escolhido.durationRaw || null,
          thumbnail: escolhido.thumbnails?.[0]?.url || null,
          author: escolhido.channel?.name || escolhido.channel?.title || '—',
          requestedBy: '📻 AutoPlay',
        };
      }
    } catch (err) {
      console.error('[music] AutoPlay falhou:', err.message);
    }
    return null;
  }

  // -------------------------------------------------------------- controles
  skip() {
    this.player.stop();
  }

  back() {
    const prev = this.history.pop();
    if (!prev) return false;
    this.loop = false;
    this.queue.unshift(prev);
    this.player.stop();
    return true;
  }

  /** Alterna pausado/tocando. Retorna true se ficou pausado. */
  togglePause() {
    if (this.player.state.status === AudioPlayerStatus.Paused) {
      this.player.unpause();
      return false;
    }
    this.player.pause();
    return true;
  }

  pause() {
    this.player.pause();
  }

  resume() {
    this.player.unpause();
  }

  get isPaused() {
    return this.player.state.status === AudioPlayerStatus.Paused;
  }

  toggleLoop() {
    this.loop = !this.loop;
    return this.loop;
  }

  toggleAutoplay() {
    this.autoplay = !this.autoplay;
    return this.autoplay;
  }

  shuffle() {
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(2, Math.round(v * 10) / 10));
    this.currentResource?.volume?.setVolume(this.volume);
    return this.volume;
  }

  volumeUp() {
    return this.setVolume(this.volume + 0.1);
  }

  volumeDown() {
    return this.setVolume(this.volume - 0.1);
  }

  stop() {
    this.queue = [];
    this.loop = false;
    this.autoplay = false;
    this.player.stop();
    this.destroy();
  }

  // ------------------------------------------------------------------ painel
  buildEmbed() {
    const t = this.current;
    const embed = baseEmbed()
      .setTitle('🎶 Painel de música')
      .setDescription(`💿 **${t.title}**`)
      .addFields(
        { name: '🙋 Pedido por', value: `${t.requestedBy}`, inline: true },
        { name: '⏱️ Duração', value: t.durationRaw || '—', inline: true },
        { name: '🎤 Autor', value: t.author || '—', inline: true },
        { name: '🔊 Volume', value: `${Math.round(this.volume * 100)}%`, inline: true },
        { name: '🔁 Loop', value: this.loop ? 'Ligado' : 'Desligado', inline: true },
        { name: '📻 AutoPlay', value: this.autoplay ? 'Ligado' : 'Desligado', inline: true }
      );
    if (t.thumbnail) embed.setThumbnail(t.thumbnail);
    if (this.queue.length) embed.setFooter({ text: `${this.queue.length} na fila • 🗡️ CEIFADOR` });
    return embed;
  }

  buildComponents() {
    const btn = (id, label, emoji, style = ButtonStyle.Secondary) =>
      new ButtonBuilder().setCustomId(`music:${id}`).setLabel(label).setEmoji(emoji).setStyle(style);

    const row1 = new ActionRowBuilder().addComponents(
      btn('down', 'Down', '🔉'),
      btn('back', 'Back', '⏮️'),
      btn('pause', this.isPaused ? 'Play' : 'Pause', this.isPaused ? '▶️' : '⏸️', ButtonStyle.Primary),
      btn('skip', 'Skip', '⏭️'),
      btn('up', 'Up', '🔊')
    );
    const row2 = new ActionRowBuilder().addComponents(
      btn('shuffle', 'Shuffle', '🔀'),
      btn('loop', 'Loop', '🔁', this.loop ? ButtonStyle.Success : ButtonStyle.Secondary),
      btn('stop', 'Stop', '⏹️', ButtonStyle.Danger),
      btn('autoplay', 'AutoPlay', '📻', this.autoplay ? ButtonStyle.Success : ButtonStyle.Secondary),
      btn('playlist', 'Playlist', '🎵')
    );
    return [row1, row2];
  }

  renderPanel() {
    return { embeds: [this.buildEmbed()], components: this.buildComponents() };
  }

  async showPanel() {
    if (!this.textChannel || !this.current) return;
    await this.removePanel();
    const trackAtSend = this.current;
    const msg = await this.textChannel.send(this.renderPanel()).catch(() => null);
    if (this.current !== trackAtSend) {
      msg?.delete().catch(() => null);
      return;
    }
    this.panelMessage = msg;
  }

  async refreshPanel() {
    if (this.panelMessage) {
      await this.panelMessage.edit(this.renderPanel()).catch(() => null);
    }
  }

  async removePanel() {
    if (this.panelMessage) {
      await this.panelMessage.delete().catch(() => null);
      this.panelMessage = null;
    }
  }

  // ------------------------------------------------------------------- saída
  scheduleLeave() {
    this.clearLeave();
    this.leaveTimeout = setTimeout(() => this.destroy(), 2 * 60 * 1000);
  }

  clearLeave() {
    if (this.leaveTimeout) {
      clearTimeout(this.leaveTimeout);
      this.leaveTimeout = null;
    }
  }

  destroy() {
    this.clearLeave();
    this.removePanel();
    this.current = null;
    this.queue = [];
    this.history = [];
    this.currentResource = null;
    this.voiceChannelId = null;
    try {
      this.connection?.destroy();
    } catch {
      // já destruída
    }
    this.connection = null;
    if (this.guild.client.music) {
      this.guild.client.music.delete(this.guild.id);
    }
  }
}

module.exports = GuildPlayer;
