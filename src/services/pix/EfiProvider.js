'use strict';

const fs = require('node:fs');
const https = require('node:https');
const PixProvider = require('./PixProvider');

const PROD_HOST = 'pix.api.efipay.com.br';
const SANDBOX_HOST = 'pix-h.api.efipay.com.br';

/**
 * Provedor automático via Efí Bank (antiga Gerencianet). Assim como o
 * Mercado Pago, cria a cobrança pela API e recebe a confirmação por
 * webhook (rota /webhook/efi), liberando o saldo automaticamente.
 *
 * Diferente do Mercado Pago, a API Pix da Efí exige mTLS: além de
 * EFI_CLIENT_ID/EFI_CLIENT_SECRET, é obrigatório um certificado .p12
 * baixado no painel da Efí, referenciado por EFI_CERT_PATH.
 */
class EfiProvider extends PixProvider {
  constructor(config) {
    super();
    this.config = config;
    this._token = null;
    this._tokenExpiresAt = 0;
  }

  get efiConfig() {
    return this.config.pix.efi;
  }

  get host() {
    return this.efiConfig.sandbox ? SANDBOX_HOST : PROD_HOST;
  }

  async createCharge({ amountCents, description, referenceId }) {
    const { clientId, clientSecret } = this.efiConfig;
    if (!clientId || !clientSecret) {
      throw new Error('Credenciais da Efí (Client ID/Secret) não configuradas.');
    }
    if (!this.config.pix.key) {
      throw new Error('Chave Pix não configurada. Configure com `/admin pix chave`.');
    }

    const txid = referenceId.replace(/-/g, '');

    const cob = await this._apiRequest('PUT', `/v2/cob/${txid}`, {
      calendario: { expiracao: 3600 },
      valor: { original: (amountCents / 100).toFixed(2) },
      chave: this.config.pix.key,
      solicitacaoPagador: (description || 'Deposito Ceifador').slice(0, 140),
    });

    const loc = await this._apiRequest('GET', `/v2/loc/${cob.loc.id}/qrcode`, null);

    return {
      providerTxid: txid,
      copyPaste: loc.qrcode,
      qrCodeBase64: loc.imagemQrcode ? loc.imagemQrcode.split(',')[1] : null,
      automatic: true,
    };
  }

  async fetchStatus(providerTxid) {
    const cob = await this._apiRequest('GET', `/v2/cob/${providerTxid}`, null);
    return {
      status: mapStatus(cob.status),
      amountCents: Math.round(Number(cob.valor?.original || 0) * 100),
      externalReference: providerTxid,
    };
  }

  /** Registra a URL de notificação para a chave Pix configurada. */
  async registerWebhook(publicUrl) {
    if (!this.config.pix.key) {
      throw new Error('Configure a chave Pix antes de registrar o webhook.');
    }
    const chave = encodeURIComponent(this.config.pix.key);
    await this._apiRequest('PUT', `/v2/webhook/${chave}`, {
      webhookUrl: `${publicUrl}/webhook/efi`,
    });
  }

  async _apiRequest(method, path, body) {
    const token = await this._getToken();
    return this._rawRequest(method, path, body, { Authorization: `Bearer ${token}` });
  }

  async _getToken() {
    if (this._token && Date.now() < this._tokenExpiresAt) {
      return this._token;
    }
    const basic = Buffer.from(`${this.efiConfig.clientId}:${this.efiConfig.clientSecret}`).toString('base64');
    const data = await this._rawRequest('POST', '/oauth/token', { grant_type: 'client_credentials' }, { Authorization: `Basic ${basic}` });
    this._token = data.access_token;
    this._tokenExpiresAt = Date.now() + Math.max(0, (data.expires_in || 3600) - 30) * 1000;
    return this._token;
  }

  _rawRequest(method, path, body, extraHeaders = {}) {
    const { certPath, certPassphrase } = this.efiConfig;
    if (!certPath) {
      return Promise.reject(new Error('Certificado da Efí (mTLS) não configurado. Defina EFI_CERT_PATH.'));
    }
    if (!fs.existsSync(certPath)) {
      return Promise.reject(new Error(`Certificado da Efí não encontrado em: ${certPath}`));
    }

    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json', ...extraHeaders };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          host: this.host,
          path,
          method,
          headers,
          pfx: fs.readFileSync(certPath),
          passphrase: certPassphrase || undefined,
        },
        (res) => {
          let raw = '';
          res.on('data', (chunk) => {
            raw += chunk;
          });
          res.on('end', () => {
            let data = {};
            try {
              data = raw ? JSON.parse(raw) : {};
            } catch {
              reject(new Error(`Resposta inválida da Efí (HTTP ${res.statusCode}): ${raw.slice(0, 200)}`));
              return;
            }
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data);
            } else {
              reject(new Error(data.mensagem || data.error_description || data.detail || `Erro Efí (HTTP ${res.statusCode})`));
            }
          });
        }
      );
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }
}

function mapStatus(efiStatus) {
  switch (efiStatus) {
    case 'CONCLUIDA':
      return 'completed';
    case 'REMOVIDA_PELO_USUARIO_RECEBEDOR':
    case 'REMOVIDA_PELO_PSP':
      return 'failed';
    default:
      return 'pending';
  }
}

module.exports = EfiProvider;
