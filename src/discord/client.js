'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const notifier = require('./notifier');
const { DISABLED_COMMAND_FILES } = require('./disabledCommands');

function loadCommands() {
  const commands = new Collection();
  const commandsDir = path.join(__dirname, 'commands');
  const files = fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js') && !DISABLED_COMMAND_FILES.has(f));
  for (const file of files) {
    const command = require(path.join(commandsDir, file));
    if (command?.data?.name) {
      commands.set(command.data.name, command);
    }
  }
  return commands;
}

function loadEvents(client) {
  const eventsDir = path.join(__dirname, 'events');
  const files = fs.readdirSync(eventsDir).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    const event = require(path.join(eventsDir, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
}

function createClient() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.commands = loadCommands();
  loadEvents(client);
  notifier.setClient(client);
  return client;
}

module.exports = { createClient };
