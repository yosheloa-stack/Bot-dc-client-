'use strict';

require('dotenv').config();

const settingsRepository = require('../repositories/settingsRepository');

function bool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function getConfig() {
  const db = settingsRepository.getAll();
  const port = Number(process.env.PORT || 3000);

  return {
    discord: {
      token: process.env.DISCORD_TOKEN || '',
      adminRoleId: db.admin_role_id || process.env.ADMIN_ROLE_ID || '',
      logChannelId: db.log_channel_id || process.env.ADMIN_LOG_CHANNEL_ID || '',
    },
    webhook: {
      enabled: bool(process.env.WEBHOOK_SERVER_ENABLED, true),
      port,
      publicUrl: (process.env.PUBLIC_URL || `http://localhost:${port}`).replace(/\/$/, ''),
    },
    passe: {
      apiKey: process.env.PASSE_API_KEY || '',
      baseUrl: (process.env.PASSE_API_BASE_URL || 'https://fluxggx.squareweb.app').replace(/\/$/, ''),
      region: (process.env.PASSE_API_REGION || 'BR').trim().toUpperCase(),
      priceCents: Number(db.passe_price_cents || 0),
    },
    pix: {
      provider: db.pix_provider || process.env.PIX_PROVIDER || 'manual',
      key: db.pix_key || process.env.PIX_KEY || '',
      merchantName: db.pix_merchant_name || process.env.PIX_MERCHANT_NAME || 'CEIFADOR',
      merchantCity: db.pix_merchant_city || process.env.PIX_MERCHANT_CITY || 'SAO PAULO',
      minDepositCents: Number(db.pix_min_deposit_cents || process.env.PIX_MIN_DEPOSIT_CENTS || 500),
      maxDepositCents: Number(db.pix_max_deposit_cents || process.env.PIX_MAX_DEPOSIT_CENTS || 500000),
      mercadoPago: {
        accessToken: db.mp_access_token || process.env.MP_ACCESS_TOKEN || '',
      },
      efi: {
        clientId: db.efi_client_id || process.env.EFI_CLIENT_ID || '',
        clientSecret: db.efi_client_secret || process.env.EFI_CLIENT_SECRET || '',
        certPath: db.efi_cert_path || process.env.EFI_CERT_PATH || '',
        certPassphrase: db.efi_cert_passphrase || process.env.EFI_CERT_PASSPHRASE || '',
        sandbox: bool(db.efi_sandbox ?? process.env.EFI_SANDBOX, false),
      },
    },
    currency: process.env.CURRENCY || 'BRL',
  };
}

module.exports = { getConfig };
