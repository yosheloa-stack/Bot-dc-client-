'use strict';

/**
 * Contrato que todo provedor de Pix deve implementar.
 * Isso permite trocar de provedor (manual, Mercado Pago, Efí, etc.)
 * sem alterar o restante do sistema.
 */
class PixProvider {
  /**
   * @param {{ amountCents: number, description: string, referenceId: string }} params
   * @returns {Promise<{ providerTxid: string, copyPaste: string, qrCodeBase64: string, automatic: boolean }>}
   */
  // eslint-disable-next-line no-unused-vars
  async createCharge(params) {
    throw new Error('createCharge não implementado');
  }

  /**
   * Consulta o status de uma cobrança diretamente na API do provedor.
   * @param {string} providerTxid
   * @returns {Promise<{ status: 'pending'|'completed'|'failed', amountCents?: number }>}
   */
  // eslint-disable-next-line no-unused-vars
  async fetchStatus(providerTxid) {
    throw new Error('fetchStatus não implementado');
  }
}

module.exports = PixProvider;
