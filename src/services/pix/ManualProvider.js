'use strict';

const { createStaticPix, hasError } = require('pix-utils');
const PixProvider = require('./PixProvider');

/**
 * Provedor "manual": gera um Pix estático (Copia e Cola + QR Code) usando
 * a chave Pix cadastrada no painel administrativo, sem depender de nenhum
 * banco/PSP externo. Como uma chave Pix estática não expõe uma API de
 * confirmação automática, a liberação do saldo nesse modo é feita pelo
 * administrador (painel web ou comando /admin) após checar o extrato.
 */
class ManualProvider extends PixProvider {
  constructor(config) {
    super();
    this.config = config;
  }

  async createCharge({ amountCents, description, referenceId }) {
    const { key, merchantName, merchantCity } = this.config.pix;
    if (!key) {
      throw new Error('Chave Pix não configurada. Configure no painel administrativo antes de gerar cobranças.');
    }

    const pix = createStaticPix({
      merchantName: sanitize(merchantName, 25) || 'CEIFADOR',
      merchantCity: sanitize(merchantCity, 15) || 'SAO PAULO',
      pixKey: key,
      infoAdicional: sanitize(description, 40) || 'Deposito Ceifador',
      transactionAmount: amountCents / 100,
      txid: sanitize(referenceId, 25).toUpperCase(),
    });

    if (hasError(pix)) {
      throw new Error(`Falha ao gerar cobrança Pix: ${pix.message}`);
    }

    const qrCodeDataUrl = await pix.toImage();

    return {
      providerTxid: referenceId,
      copyPaste: pix.toBRCode(),
      qrCodeBase64: qrCodeDataUrl.split(',')[1],
      automatic: false,
    };
  }

  async fetchStatus() {
    return { status: 'pending' };
  }
}

function sanitize(text, max) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .slice(0, max);
}

module.exports = ManualProvider;
