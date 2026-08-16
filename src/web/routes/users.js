'use strict';

const express = require('express');
const userRepository = require('../../repositories/userRepository');
const balanceService = require('../../services/balanceService');

const router = express.Router();
const PAGE_SIZE = 25;

router.get('/users', (req, res) => {
  const q = (req.query.q || '').trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const users = q ? userRepository.searchUsers(q, { limit: PAGE_SIZE }) : userRepository.listUsers({ limit: PAGE_SIZE, offset });

  res.render('users', {
    users,
    q,
    page,
    activePage: 'users',
    error: req.query.error || null,
  });
});

router.post('/users/:discordId/adjust', (req, res) => {
  const { discordId } = req.params;
  const existing = userRepository.getUser(discordId);

  if (!existing) {
    return res.redirect(`/users?error=${encodeURIComponent('Usuário não encontrado. Ele precisa usar /saldo pelo menos uma vez.')}`);
  }

  const { valor, motivo, tipo } = req.body || {};
  const amountCents = Math.round(Number(valor) * 100);

  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return res.redirect(`/users?error=${encodeURIComponent('Valor inválido.')}`);
  }

  try {
    balanceService.adminAdjust({
      discordId,
      username: existing.username,
      amountCents: tipo === 'remover' ? -amountCents : amountCents,
      actor: 'painel-web',
      description: motivo || null,
    });
  } catch (err) {
    return res.redirect(`/users?error=${encodeURIComponent(err.message)}`);
  }

  res.redirect('/users');
});

module.exports = router;
