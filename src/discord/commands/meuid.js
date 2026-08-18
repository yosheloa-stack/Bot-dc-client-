'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, logoAttachment } = require('../embeds/theme');

/** /meuid — Mostra o ID de quem usou o comando (ou de outro usuário marcado). */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('meuid')
    .setDescription('Mostra o seu ID do Discord (pronto para copiar).')
    .addUserOption((opt) => opt.setName('usuario').setDescription('Ver o ID de outra pessoa (opcional)').setRequired(false)),

  async execute(interaction) {
    const user = interaction.options.getUser('usuario') || interaction.user;
    const nome = user.globalName || user.username;

    const embed = baseEmbed()
      .setTitle('🆔 ID do Discord')
      .setDescription(`ID de **${nome}**:\n\`\`\`\n${user.id}\n\`\`\``)
      .addFields({ name: '👤 Nome', value: `${nome}`, inline: true }, { name: '🏷️ Usuário', value: `\`${user.username}\``, inline: true })
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .setFooter({ text: 'Copie o número para usar como OWNER_ID.' });

    await interaction.reply({ embeds: [embed], files: [logoAttachment()], ephemeral: true });
  },
};
