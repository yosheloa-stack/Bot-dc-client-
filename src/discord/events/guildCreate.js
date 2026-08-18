'use strict';

const { Events } = require('discord.js');
const guildSettingsRepository = require('../../repositories/guildSettingsRepository');

/** Ao entrar em um servidor novo, já cria as configurações padrão de moderação. */
module.exports = {
  name: Events.GuildCreate,
  once: false,
  execute(guild) {
    guildSettingsRepository.getSettings(guild.id); // força a criação do registro
    console.log(`[discord] Entrou no servidor: ${guild.name} (${guild.id})`);
  },
};
