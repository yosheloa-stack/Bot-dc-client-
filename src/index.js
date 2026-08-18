'use strict';

const { getConfig } = require('./config/env');
const { createClient } = require('./discord/client');
const { createWebhookServer } = require('./webhookServer');

async function main() {
  const config = getConfig();

  if (!config.discord.token) {
    console.error('[ceifador] DISCORD_TOKEN não configurado. Copie .env.example para .env e preencha o token.');
    process.exit(1);
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
