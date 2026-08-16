'use strict';

const express = require('express');
const settingsRepository = require('../../repositories/settingsRepository');
const { getConfig } = require('../../config/env');
const { getPixProvider, EfiProvider } = require('../../services/pix');

const router = express.Router();

router.get('/config', (req, res) => {
  res.render('config', {
    config: getConfig(),
    saved: req.query.saved === '1',
    error: req.query.error || null,
    activePage: 'config',
  });
});

router.post('/config', (req, res) => {
  const {
    pix_provider,
    pix_key,
    pix_merchant_name,
    pix_merchant_city,
    pix_min_deposit,
    pix_max_deposit,
    mp_access_token,
    efi_client_id,
    efi_client_secret,
    efi_cert_path,
    efi_cert_passphrase,
    efi_sandbox,
    admin_role_id,
    log_channel_id,
  } = req.body || {};

  if (pix_provider) settingsRepository.set('pix_provider', pix_provider.trim());
  if (pix_key !== undefined) settingsRepository.set('pix_key', pix_key.trim());
  if (pix_merchant_name !== undefined) settingsRepository.set('pix_merchant_name', pix_merchant_name.trim());
  if (pix_merchant_city !== undefined) settingsRepository.set('pix_merchant_city', pix_merchant_city.trim());

  const minCents = Math.round(Number(pix_min_deposit) * 100);
  if (Number.isFinite(minCents) && minCents > 0) settingsRepository.set('pix_min_deposit_cents', minCents);

  const maxCents = Math.round(Number(pix_max_deposit) * 100);
  if (Number.isFinite(maxCents) && maxCents > 0) settingsRepository.set('pix_max_deposit_cents', maxCents);

  if (mp_access_token) settingsRepository.set('mp_access_token', mp_access_token.trim());

  if (efi_client_id !== undefined) settingsRepository.set('efi_client_id', efi_client_id.trim());
  if (efi_client_secret) settingsRepository.set('efi_client_secret', efi_client_secret.trim());
  if (efi_cert_path !== undefined) settingsRepository.set('efi_cert_path', efi_cert_path.trim());
  if (efi_cert_passphrase) settingsRepository.set('efi_cert_passphrase', efi_cert_passphrase.trim());
  settingsRepository.set('efi_sandbox', efi_sandbox === 'on' ? 'true' : 'false');

  if (admin_role_id !== undefined) settingsRepository.set('admin_role_id', admin_role_id.trim());
  if (log_channel_id !== undefined) settingsRepository.set('log_channel_id', log_channel_id.trim());

  res.redirect('/config?saved=1');
});

router.post('/config/efi/webhook', async (req, res) => {
  const config = getConfig();
  const provider = getPixProvider(config);

  if (!(provider instanceof EfiProvider)) {
    return res.redirect(`/config?error=${encodeURIComponent('Selecione o provedor Efí antes de registrar o webhook.')}`);
  }

  try {
    await provider.registerWebhook(config.web.publicUrl);
  } catch (err) {
    return res.redirect(`/config?error=${encodeURIComponent(`Falha ao registrar webhook da Efí: ${err.message}`)}`);
  }

  res.redirect('/config?saved=1');
});

module.exports = router;
