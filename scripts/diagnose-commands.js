'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DISABLED_COMMAND_FILES } = require('../src/discord/disabledCommands');

const commandsDir = path.join(__dirname, '..', 'src', 'discord', 'commands');
const files = fs.readdirSync(commandsDir)
  .filter((file) => file.endsWith('.js') && !DISABLED_COMMAND_FILES.has(file))
  .sort();

const commands = files.map((file) => {
  const command = require(path.join(commandsDir, file));
  if (!command?.data?.toJSON || typeof command.execute !== 'function') {
    throw new Error(`${file}: exportação inválida; esperados data.toJSON() e execute()`);
  }
  return { file, json: command.data.toJSON() };
});

const names = commands.map(({ json }) => json.name);
const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
if (duplicates.length > 0) throw new Error(`Comandos duplicados: ${duplicates.join(', ')}`);

console.log(JSON.stringify({
  activeFiles: files,
  disabledFiles: [...DISABLED_COMMAND_FILES],
  commandCount: commands.length,
  commandNames: names,
  requiredEnv: ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'],
  guildRegistration: Boolean(process.env.DISCORD_GUILD_ID),
}, null, 2));
