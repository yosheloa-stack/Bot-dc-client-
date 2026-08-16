'use strict';

const express = require('express');
const userRepository = require('../../repositories/userRepository');
const transactionRepository = require('../../repositories/transactionRepository');
const { getConfig } = require('../../config/env');

const router = express.Router();

router.get('/', (req, res) => {
  const config = getConfig();
  const stats = {
    totalUsers: userRepository.countUsers(),
    totalBalanceCents: userRepository.sumBalances(),
    pendingDeposits: transactionRepository.countAll({ status: 'pending', type: 'deposit' }),
    pendingWithdraws: transactionRepository.countAll({ status: 'pending', type: 'withdraw' }),
    totalDepositedCents: transactionRepository.sumCompletedByType('deposit'),
    totalWithdrawnCents: transactionRepository.sumCompletedByType('withdraw'),
  };
  const recent = transactionRepository.listAll({ limit: 10 });

  res.render('dashboard', { stats, recent, config, activePage: 'dashboard' });
});

module.exports = router;
