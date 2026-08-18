'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
const { getConfig } = require('../config/env');

function collectCommandsJson() {
  const commandsDir = path.join(__dirname, 'commands');
  const files = fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'));
  return files.map((file) => require(path.join(commandsDir, file)).data.toJSON());
}

/**
 * Registra os comandos de barra na API do Discord. Usado tanto pelo script
 * standalone (`npm run deploy-commands`) quanto automaticamente a cada
 * inicialização do bot (ver src/index.js), para que subir o processo em
 * qualquer host já seja suficiente — sem precisar rodar nada à parte.
 */
async function deployCommands(config) {
  if (!config.discord.token || !config.discord.clientId) {
    throw new Error('DISCORD_TOKEN e DISCORD_CLIENT_ID são obrigatórios para registrar os comandos.');
  }

  const commands = collectCommandsJson();
  const rest = new REST().setToken(config.discord.token);

  const route = config.discord.guildId
    ? Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId)
    : Routes.applicationCommands(config.discord.clientId);

  const data = await rest.put(route, { body: commands });
  return { count: data.length, scope: config.discord.guildId ? `servidor ${config.discord.guildId}` : 'global' };
}

if (require.main === module) {
  const config = getConfig();
  console.log('[deploy] Registrando comandos de barra...');
  deployCommands(config)
    .then(({ count, scope }) => {
      console.log(`[deploy] ${count} comando(s) registrado(s) com sucesso (${scope}).`);
    })
    .catch((err) => {
      console.error('[deploy] Falha ao registrar comandos:', err.message);
      process.exit(1);
    });
}

module.exports = { deployCommands };
