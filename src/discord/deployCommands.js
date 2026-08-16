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

async function deploy() {
  const config = getConfig();
  if (!config.discord.token || !config.discord.clientId) {
    console.error('[deploy] DISCORD_TOKEN e DISCORD_CLIENT_ID são obrigatórios no .env');
    process.exit(1);
  }

  const commands = collectCommandsJson();
  const rest = new REST().setToken(config.discord.token);

  const route = config.discord.guildId
    ? Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId)
    : Routes.applicationCommands(config.discord.clientId);

  console.log(
    `[deploy] Registrando ${commands.length} comando(s) ${
      config.discord.guildId ? `no servidor ${config.discord.guildId}` : 'globalmente'
    }...`
  );
  const data = await rest.put(route, { body: commands });
  console.log(`[deploy] ${data.length} comando(s) registrado(s) com sucesso.`);
}

deploy().catch((err) => {
  console.error('[deploy] Falha ao registrar comandos:', err);
  process.exit(1);
});
