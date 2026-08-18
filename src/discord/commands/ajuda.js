'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, logoAttachment } = require('../embeds/theme');

/** /ajuda — Lista todos os comandos e recursos do Ceifador. */
module.exports = {
  data: new SlashCommandBuilder().setName('ajuda').setDescription('Lista todos os comandos e recursos do Ceifador.'),

  async execute(interaction) {
    const embed = baseEmbed()
      .setTitle('🗡️ Central de Ajuda — Ceifador')
      .setDescription('Saldo com Pix automático, moderação e música em um só bot.\n\n💡 Prefere clicar em vez de digitar? Use `/painel` para abrir os comandos por **botão e formulário**.')
      .addFields(
        {
          name: '💠 Saldo e Pix',
          value: [
            '`/saldo` — mostra seu saldo atual',
            '`/depositar valor` — gera um Pix (QR Code + Copia e Cola)',
            '`/sacar valor chave_pix` — solicita uma retirada',
            '`/historico` — suas últimas transações',
          ].join('\n'),
        },
        {
          name: '⚙️ Administração',
          value: [
            '`/setup` — cria cargos, categorias e canais automaticamente (admin)',
            '`/admin moderacao ver` — mostra a configuração de moderação',
            '`/admin moderacao sistema` — liga/desliga um sistema',
            '`/admin moderacao acao` — define a punição de um sistema',
            '`/admin pix` `/admin saldo` `/admin saques` — ver `/ajuda` do painel administrativo web',
          ].join('\n'),
        },
        {
          name: '🛡️ Moderação',
          value: ['`/avisos add` — adiciona um aviso', '`/avisos ver` — vê os avisos de alguém', '`/avisos limpar` — limpa os avisos'].join('\n'),
        },
        {
          name: '📢 Utilidades',
          value: ['`/marcar` — marca todo mundo (@everyone)', '`/convite` — link para adicionar o Ceifador em outros servidores', '`/criador` — mostra o criador do bot', '`/meuid` — mostra o seu ID do Discord', '`/ping` — latência do bot'].join('\n'),
        },
        {
          name: '🎵 Música',
          value: [
            '`/tocar` — toca uma música na call (nome ou link do YouTube)',
            'Um **painel com botões** aparece: Pause, Skip, Back, Volume,',
            'Loop, Shuffle, AutoPlay, Stop e Playlist — tudo no clique!',
            '`/pular` `/pausar` `/retomar` `/fila` `/parar` também funcionam',
          ].join('\n'),
        },
        {
          name: '🔒 Proteções automáticas',
          value: ['**Anti-Link** — remove links não permitidos', '**Anti-Spam** — bloqueia flood e repetição', '**Anti-NSFW** — bloqueia pornografia (texto, links, figurinhas, imagens e vídeos)'].join('\n'),
        }
      );
    await interaction.reply({ embeds: [embed], files: [logoAttachment()], ephemeral: true });
  },
};
