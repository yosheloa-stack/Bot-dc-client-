'use strict';

const { getConfig } = require('./config/env');
const { createClient } = require('./discord/client');
const { createWebhookServer } = require('./webhookServer');
const { deployCommands } = require('./discord/deployCommands');

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

  const client = createClient();
  await client.login(config.discord.token);

  if (config.webhook.enabled) {
    const server = createWebhookServer();
    server.listen(config.webhook.port, () => {
      console.log(`[webhook] Escutando notificações de pagamento em ${config.webhook.publicUrl}`);
    });
  }
}

main().catch((err) => {
  console.error('[ceifador] Falha ao iniciar:', err);
  process.exit(1);
});
