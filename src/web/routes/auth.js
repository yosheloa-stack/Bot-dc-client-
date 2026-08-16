'use strict';

const express = require('express');
const { getConfig } = require('../../config/env');
const { safeCompare } = require('../../utils/safeCompare');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session?.isAdmin) return res.redirect('/');
  res.render('login', { error: null });
});

router.post('/login', (req, res) => {
  const config = getConfig();
  const { username, password } = req.body || {};

  const validUser = safeCompare(username, config.web.adminUser);
  const validPassword = safeCompare(password, config.web.adminPassword);

  if (validUser && validPassword) {
    req.session.isAdmin = true;
    return res.redirect('/');
  }

  res.status(401).render('login', { error: 'Usuário ou senha inválidos.' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
