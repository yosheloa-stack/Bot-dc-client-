'use strict';

const { getConfig } = require('./config/env');
const { createClient } = require('./discord/client');
const { createServer } = require('./web/server');
const { deployCommands } = require('./discord/deployCommands');
const { initMusic } = require('./music/init');

async function main() {
  const config = getConfig();

  if (!config.discord.token) {
    console.error('[ceifador] DISCORD_TOKEN não configurado. Copie .env.example para .env e preencha os valores.');
    process.exit(1);
  }

  // Registra os comandos de barra a cada boot, para que subir o processo
  // em qualquer host (Square Cloud, VPS, etc.) já seja suficiente — sem
  // precisar rodar `npm run deploy-commands` manualmente à parte.
  try {
    const { count, scope } = await deployCommands(config);
    console.log(`[discord] ${count} comando(s) de barra registrado(s) (${scope}).`);
  } catch (err) {
    console.error('[discord] Falha ao registrar comandos de barra automaticamente:', err.message);
  }

  await initMusic();

  const client = createClient();
  await client.login(config.discord.token);

  if (config.web.enabled) {
    const app = createServer();
    app.listen(config.web.port, () => {
      console.log(`[web] Painel administrativo disponível em ${config.web.publicUrl}`);
    });
  }
}

main().catch((err) => {
  console.error('[ceifador] Falha ao iniciar:', err);
  process.exit(1);
});
