'use strict';

const express = require('express');
const { getConfig } = require('../../config/env');
const { getPixProvider, MercadoPagoProvider, EfiProvider } = require('../../services/pix');
const transactionRepository = require('../../repositories/transactionRepository');
const balanceService = require('../../services/balanceService');
const { notifyDepositCompleted } = require('../../discord/notifier');

const router = express.Router();

router.get('/webhook/mercadopago', (req, res) => {
  res.status(200).send('Ceifador Pix webhook ativo');
});

router.post('/webhook/mercadopago', express.json(), async (req, res) => {
  const config = getConfig();
  const provider = getPixProvider(config);

  if (!(provider instanceof MercadoPagoProvider)) {
    return res.status(200).send('ignored');
  }

  const topic = req.query.type || req.body?.type;
  const dataId = req.query['data.id'] || req.body?.data?.id;

  if (topic !== 'payment' || !dataId) {
    return res.status(200).send('ignored');
  }

  const validSignature = provider.verifySignature({
    xSignature: req.headers['x-signature'],
    xRequestId: req.headers['x-request-id'],
    dataId,
    secret: process.env.MP_WEBHOOK_SECRET,
  });

  if (!validSignature) {
    console.warn('[webhook] Assinatura inválida do Mercado Pago recebida.');
    return res.status(401).send('invalid signature');
  }

  try {
    const status = await provider.fetchStatus(dataId);
    const tx =
      transactionRepository.getTransactionByProviderTxid('mercadopago', String(dataId)) ||
      (status.externalReference ? transactionRepository.getTransaction(status.externalReference) : null);

    if (!tx) {
      console.warn(`[webhook] Nenhuma transação encontrada para o pagamento Mercado Pago ${dataId}.`);
      return res.status(200).send('ok');
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

  res.status(200).send('ok');
});

router.get('/webhook/efi', (req, res) => {
  res.status(200).send('Ceifador Pix webhook (Efí) ativo');
});

router.post('/webhook/efi', express.json(), async (req, res) => {
  const config = getConfig();
  const provider = getPixProvider(config);

  if (!(provider instanceof EfiProvider)) {
    return res.status(200).send('ignored');
  }

  const items = Array.isArray(req.body?.pix) ? req.body.pix : [];

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

  res.status(200).send('ok');
});

module.exports = router;
