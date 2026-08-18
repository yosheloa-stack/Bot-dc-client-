'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, logoAttachment } = require('../embeds/theme');
const { getConfig } = require('../../config/env');

/**
 * /criador — Mostra quem é o criador/dono do bot.
 * Se OWNER_ID estiver definido no .env, busca o perfil real no Discord.
 */
module.exports = {
  data: new SlashCommandBuilder().setName('criador').setDescription('Mostra o criador do bot.'),

  async execute(interaction) {
    const config = getConfig();
    let user = null;
    if (config.discord.ownerId) {
      user = await interaction.client.users.fetch(config.discord.ownerId).catch(() => null);
    }

    const embed = baseEmbed().setTitle('👑 Criador do Ceifador');

    if (user) {
      const nome = user.globalName || user.username;
      embed
        .setDescription(`Este bot foi criado por **${nome}**.`)
        .addFields(
          { name: '👤 Nome', value: `${nome}`, inline: true },
          { name: '🏷️ Usuário', value: `\`${user.username}\``, inline: true },
          { name: '🆔 ID', value: `\`${user.id}\``, inline: true }
        )
        .setThumbnail(user.displayAvatarURL({ size: 256 }));
    } else {
      embed.setDescription('Configure `OWNER_ID` no `.env` para este comando mostrar o perfil do dono do bot.');
    }

    await interaction.reply({ embeds: [embed], files: [logoAttachment()], ephemeral: true });
  },
};
