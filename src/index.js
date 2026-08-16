'use strict';

const { getConfig } = require('./config/env');
const { createClient } = require('./discord/client');
const { createServer } = require('./web/server');

async function main() {
  const config = getConfig();

  if (!config.discord.token) {
    console.error('[ceifador] DISCORD_TOKEN não configurado. Copie .env.example para .env e preencha os valores.');
    process.exit(1);
  }

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
