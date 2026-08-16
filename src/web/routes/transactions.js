'use strict';

const express = require('express');
const transactionRepository = require('../../repositories/transactionRepository');
const balanceService = require('../../services/balanceService');
const { getConfig } = require('../../config/env');
const { getPixProvider } = require('../../services/pix');
const { notifyDepositCompleted, notifyWithdrawResolved } = require('../../discord/notifier');

const router = express.Router();
const PAGE_SIZE = 25;

router.get('/transactions', (req, res) => {
  const status = req.query.status || null;
  const type = req.query.type || null;
  const page = Math.max(1, Number(req.query.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const transactions = transactionRepository.listAll({ limit: PAGE_SIZE, offset, status, type });
  const total = transactionRepository.countAll({ status, type });

  res.render('transactions', {
    transactions,
    status,
    type,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    activePage: 'transactions',
    error: req.query.error || null,
  });
});

router.post('/transactions/:id/complete-withdraw', async (req, res) => {
  try {
    const tx = balanceService.completeWithdraw(req.params.id, 'painel-web');
    await notifyWithdrawResolved(tx.discord_id, tx);
  } catch (err) {
    return res.redirect(`/transactions?error=${encodeURIComponent(err.message)}`);
  }
  res.redirect('/transactions');
});

router.post('/transactions/:id/cancel-withdraw', async (req, res) => {
  try {
    const tx = balanceService.cancelWithdraw(req.params.id, 'painel-web');
    await notifyWithdrawResolved(tx.discord_id, tx);
  } catch (err) {
    return res.redirect(`/transactions?error=${encodeURIComponent(err.message)}`);
  }
  res.redirect('/transactions');
});

router.post('/transactions/:id/complete-deposit', async (req, res) => {
  try {
    const tx = balanceService.completeDeposit(req.params.id);
    await notifyDepositCompleted(tx.discord_id, tx);
  } catch (err) {
    return res.redirect(`/transactions?error=${encodeURIComponent(err.message)}`);
  }
  res.redirect('/transactions');
});

router.post('/transactions/:id/fail-deposit', (req, res) => {
  try {
    balanceService.failDeposit(req.params.id);
  } catch (err) {
    return res.redirect(`/transactions?error=${encodeURIComponent(err.message)}`);
  }
  res.redirect('/transactions');
});

router.post('/transactions/:id/refresh', async (req, res) => {
  const tx = transactionRepository.getTransaction(req.params.id);
  if (!tx || tx.type !== 'deposit' || tx.status !== 'pending') {
    return res.redirect('/transactions');
  }

  const config = getConfig();
  const provider = getPixProvider(config);

  try {
    const result = await provider.fetchStatus(tx.provider_txid);
    if (result.status === 'completed') {
      const updated = balanceService.completeDeposit(tx.id);
      await notifyDepositCompleted(updated.discord_id, updated);
    } else if (result.status === 'failed') {
      balanceService.failDeposit(tx.id);
    }
  } catch (err) {
    return res.redirect(`/transactions?error=${encodeURIComponent(err.message)}`);
  }

  res.redirect('/transactions');
});

module.exports = router;
