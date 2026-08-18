'use strict';

const crypto = require('node:crypto');
const PixProvider = require('./PixProvider');

const API_BASE = 'https://api.mercadopago.com';

/**
 * Provedor automatico via Mercado Pago. Cria uma cobranca Pix pela API de
 * pagamentos e recebe a confirmacao por webhook (rota /webhook/mercadopago),
 * permitindo liberar o saldo assim que o pagamento for aprovado, sem
 * intervencao manual.
 *
 * Requer MP_ACCESS_TOKEN (Access Token de producao ou teste) configurado
 * na variavel de ambiente.
 */
class MercadoPagoProvider extends PixProvider {
  constructor(config) {
    super();
    this.config = config;
  }

  get accessToken() {
    return this.config.pix.mercadoPago.accessToken;
  }

  async createCharge({ amountCents, description, referenceId }) {
    if (!this.accessToken) {
      throw new Error('MP_ACCESS_TOKEN não configurado. Defina essa variável de ambiente.');
    }

    const notificationUrl = `${this.config.webhook.publicUrl}/webhook/mercadopago`;

    const response = await fetch(`${API_BASE}/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
        'X-Idempotency-Key': referenceId,
      },
      body: JSON.stringify({
        transaction_amount: Number((amountCents / 100).toFixed(2)),
        description: description || 'Deposito Ceifador',
        payment_method_id: 'pix',
        external_reference: referenceId,
        notification_url: notificationUrl,
        payer: {
          email: `${referenceId}@ceifador.bot`,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const reason = data?.message || data?.cause?.[0]?.description || 'erro desconhecido';
      throw new Error(`Mercado Pago recusou a cobrança: ${reason}`);
    }

    const txData = data.point_of_interaction?.transaction_data;
    if (!txData?.qr_code) {
      throw new Error('Mercado Pago não retornou os dados do Pix (qr_code).');
    }

    return {
      providerTxid: String(data.id),
      copyPaste: txData.qr_code,
      qrCodeBase64: txData.qr_code_base64,
      automatic: true,
    };
  }

  async fetchStatus(providerTxid) {
    const response = await fetch(`${API_BASE}/v1/payments/${providerTxid}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Falha ao consultar pagamento no Mercado Pago: ${data?.message || response.status}`);
    }
    return {
      status: mapStatus(data.status),
      amountCents: Math.round((data.transaction_amount || 0) * 100),
      externalReference: data.external_reference,
    };
  }

  /**
   * Valida a assinatura do webhook do Mercado Pago (x-signature),
   * quando um MP_WEBHOOK_SECRET estiver configurado.
   */
  verifySignature({ xSignature, xRequestId, dataId, secret }) {
    if (!secret) return true;
    if (!xSignature) return false;

    const parts = Object.fromEntries(
      xSignature.split(',').map((part) => {
        const [k, v] = part.split('=');
        return [k?.trim(), v?.trim()];
      })
    );
    const { ts, v1 } = parts;
    if (!ts || !v1) return false;

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(v1);

    return expectedBuf.length === receivedBuf.length && crypto.timingSafeEqual(expectedBuf, receivedBuf);
  }
}

function mapStatus(mpStatus) {
  switch (mpStatus) {
    case 'approved':
      return 'completed';
    case 'rejected':
    case 'cancelled':
      return 'failed';
    default:
      return 'pending';
  }
}

module.exports = MercadoPagoProvider;
