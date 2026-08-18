'use strict';

const http = require('node:http');
const { getConfig } = require('./config/env');
const { getPixProvider, MercadoPagoProvider, EfiProvider } = require('./services/pix');
const transactionRepository = require('./repositories/transactionRepository');
const balanceService = require('./services/balanceService');
const { notifyDepositCompleted } = require('./discord/notifier');

/**
 * Servidor HTTP mínimo, sem interface nenhuma: existe só para receber as
 * notificações de pagamento do Mercado Pago e da Efí (necessárias para a
 * liberação automática de saldo nesses dois provedores). Toda configuração
 * do bot é feita por variáveis de ambiente ou pelos comandos /admin do
 * Discord — não há login nem páginas para acessar no navegador.
 */

const MAX_BODY_BYTES = 1_000_000;

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error('Corpo da requisição muito grande.'));
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

async function handleMercadoPagoWebhook(req, res, url) {
  const config = getConfig();
  const provider = getPixProvider(config);
  if (!(provider instanceof MercadoPagoProvider)) return send(res, 200, 'ignored');

  const body = await readJsonBody(req);
  const topic = url.searchParams.get('type') || body?.type;
  const dataId = url.searchParams.get('data.id') || body?.data?.id;

  if (topic !== 'payment' || !dataId) return send(res, 200, 'ignored');

  const validSignature = provider.verifySignature({
    xSignature: req.headers['x-signature'],
    xRequestId: req.headers['x-request-id'],
    dataId,
    secret: process.env.MP_WEBHOOK_SECRET,
  });
  if (!validSignature) {
    console.warn('[webhook] Assinatura inválida do Mercado Pago recebida.');
    return send(res, 401, 'invalid signature');
  }

  try {
    const status = await provider.fetchStatus(dataId);
    const tx =
      transactionRepository.getTransactionByProviderTxid('mercadopago', String(dataId)) ||
      (status.externalReference ? transactionRepository.getTransaction(status.externalReference) : null);

    if (!tx) {
      console.warn(`[webhook] Nenhuma transação encontrada para o pagamento Mercado Pago ${dataId}.`);
      return send(res, 200, 'ok');
    }
    if (tx.status === 'pending') {
      if (status.status === 'completed') {
        const updated = balanceService.completeDeposit(tx.id);
        await notifyDepositCompleted(updated.discord_id, updated);
      } else if (status.status === 'failed') {
        balanceService.failDeposit(tx.id);
      }
    }
  } catch (err) {
    console.error('[webhook] Erro ao processar notificação do Mercado Pago:', err);
  }
  send(res, 200, 'ok');
}

async function handleEfiWebhook(req, res) {
  const config = getConfig();
  const provider = getPixProvider(config);
  if (!(provider instanceof EfiProvider)) return send(res, 200, 'ignored');

  const body = await readJsonBody(req);
  const items = Array.isArray(body?.pix) ? body.pix : [];

  for (const item of items) {
    const txid = item?.txid;
    if (!txid) continue;
    try {
      const tx = transactionRepository.getTransactionByProviderTxid('efi', String(txid));
      if (!tx || tx.status !== 'pending') continue;

      // O corpo do webhook não é confiado diretamente: o status é
      // reconsultado de forma autenticada antes de liberar o saldo.
      const status = await provider.fetchStatus(txid);
      if (status.status === 'completed') {
        const updated = balanceService.completeDeposit(tx.id);
        await notifyDepositCompleted(updated.discord_id, updated);
      } else if (status.status === 'failed') {
        balanceService.failDeposit(tx.id);
      }
    } catch (err) {
      console.error(`[webhook] Erro ao processar notificação da Efí (txid ${txid}):`, err);
    }
  }
  send(res, 200, 'ok');
}

function createWebhookServer() {
  return http.createServer(async (req, res) => {
    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      return send(res, 400, 'bad request');
    }

    try {
      if (url.pathname === '/webhook/mercadopago') {
        if (req.method === 'GET') return send(res, 200, 'Ceifador Pix webhook ativo');
        if (req.method === 'POST') return await handleMercadoPagoWebhook(req, res, url);
      }
      if (url.pathname === '/webhook/efi') {
        if (req.method === 'GET') return send(res, 200, 'Ceifador Pix webhook (Efí) ativo');
        if (req.method === 'POST') return await handleEfiWebhook(req, res);
      }
      send(res, 404, 'not found');
    } catch (err) {
      console.error('[webhook] Erro não tratado:', err);
      send(res, 500, 'internal error');
    }
  });
}

module.exports = { createWebhookServer };
