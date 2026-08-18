'use strict';

const path = require('node:path');
const express = require('express');
const session = require('express-session');
const { getConfig } = require('../config/env');
const requireAdmin = require('./middleware/requireAdmin');
const { SqliteSessionStore } = require('./sessionStore');
const { centsToBRL, formatDate } = require('../utils/format');
const { typeLabel, statusLabel } = require('../utils/labels');

const webhookRoutes = require('./routes/webhook');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const configRoutes = require('./routes/config');
const usersRoutes = require('./routes/users');
const transactionsRoutes = require('./routes/transactions');

function createServer() {
  const config = getConfig();
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.urlencoded({ extended: true }));

  app.locals.centsToBRL = centsToBRL;
  app.locals.formatDate = formatDate;
  app.locals.typeLabel = typeLabel;
  app.locals.statusLabel = statusLabel;

  // Rota pública do webhook, montada antes da sessão/autenticação.
  app.use(webhookRoutes);

  app.use(
    session({
      store: new SqliteSessionStore(),
      secret: config.web.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 1000 * 60 * 60 * 8, httpOnly: true, sameSite: 'lax' },
    })
  );

  app.use(authRoutes);

  app.use(requireAdmin);
  app.use(dashboardRoutes);
  app.use(configRoutes);
  app.use(usersRoutes);
  app.use(transactionsRoutes);

  app.use((req, res) => {
    res.status(404).render('404');
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('[web] Erro não tratado:', err);
    res.status(500).send('Erro interno do servidor.');
  });

  return app;
}

module.exports = { createServer };
