'use strict';

const { ActivityType, Events } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { DISABLED_COMMAND_FILES } = require('../disabledCommands');

function collectCommands() {
  const commandsDir = path.join(__dirname, '..', 'commands');
  const files = fs.readdirSync(commandsDir)
    .filter((file) => file.endsWith('.js') && !DISABLED_COMMAND_FILES.has(file));
  return files.map((file) => require(path.join(commandsDir, file)).data.toJSON());
}

async function registerCommands(client) {
  const commands = collectCommands();
  try {
    const registered = await client.application.commands.set(commands);
    const registeredCount = registered?.size ?? registered?.length ?? commands.length;
    const registeredNames = registered?.values
      ? [...registered.values()].map((command) => command.name)
      : registered.map((command) => command.name);
    console.log(`[discord] ${registeredCount} comando(s) registrado(s) globalmente: ${registeredNames.join(', ')}.`);
  } catch (err) {
    console.error('[discord] Falha ao registrar comandos globalmente:', err.message);
  }
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`[discord] Conectado como ${client.user.tag}`);
    client.user.setPresence({
      status: 'online',
      activities: [{ name: 'saldos serem ceifados 🗡️', type: ActivityType.Watching }],
    });
    await registerCommands(client);
  },
};
