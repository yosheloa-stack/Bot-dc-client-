'use strict';

const userRepository = require('../repositories/userRepository');
const transactionRepository = require('../repositories/transactionRepository');

class InsufficientBalanceError extends Error {}

function getBalance(discordId, username) {
  const user = userRepository.ensureUser(discordId, username);
  return user.balance_cents;
}

function createPendingDeposit({ id, discordId, username, amountCents, provider, providerTxid, pixCopyPaste, pixQrcodeBase64, description }) {
  userRepository.ensureUser(discordId, username);
  return transactionRepository.createTransaction({
    id,
    discordId,
    type: 'deposit',
    amountCents,
    status: 'pending',
    provider,
    providerTxid,
    pixCopyPaste,
    pixQrcodeBase64,
    description,
  });
}

function completeDeposit(transactionId) {
  const tx = transactionRepository.getTransaction(transactionId);
  if (!tx) throw new Error('Transação não encontrada');
  if (tx.status === 'completed') return tx;
  userRepository.updateBalance(tx.discord_id, tx.amount_cents);
  return transactionRepository.updateStatus(transactionId, 'completed');
}

function failDeposit(transactionId) {
  const tx = transactionRepository.getTransaction(transactionId);
  if (!tx || tx.status !== 'pending') return tx;
  return transactionRepository.updateStatus(transactionId, 'failed');
}

/**
 * Solicita uma retirada (saque) via Pix. O saldo é debitado imediatamente
 * (reservando os fundos) e a transação fica pendente até um administrador
 * confirmar o envio manual do Pix (ou cancelar, devolvendo o saldo).
 * Não existe API genérica de "Pix automático de saída" sem uma instituição
 * de pagamento licenciada, então esta etapa final é sempre confirmada
 * manualmente pelo administrador.
 */
function requestWithdraw({ discordId, username, amountCents, pixKey, description = null }) {
  const user = userRepository.ensureUser(discordId, username);
  if (amountCents <= 0) {
    throw new Error('Valor de retirada inválido.');
  }
  if (user.balance_cents < amountCents) {
    throw new InsufficientBalanceError('Saldo insuficiente para esta retirada.');
  }
  userRepository.updateBalance(discordId, -amountCents);
  return transactionRepository.createTransaction({
    discordId,
    type: 'withdraw',
    amountCents,
    status: 'pending',
    provider: 'manual',
    description: description || `Chave Pix de destino: ${pixKey}`,
  });
}

function completeWithdraw(transactionId, actor = null) {
  const tx = transactionRepository.getTransaction(transactionId);
  if (!tx) throw new Error('Transação não encontrada');
  if (tx.type !== 'withdraw') throw new Error('Transação não é uma retirada');
  if (tx.status !== 'pending') return tx;
  return transactionRepository.updateStatus(transactionId, 'completed', actor);
}

function cancelWithdraw(transactionId, actor = null) {
  const tx = transactionRepository.getTransaction(transactionId);
  if (!tx) throw new Error('Transação não encontrada');
  if (tx.type !== 'withdraw') throw new Error('Transação não é uma retirada');
  if (tx.status !== 'pending') return tx;
  userRepository.updateBalance(tx.discord_id, tx.amount_cents);
  return transactionRepository.updateStatus(transactionId, 'cancelled', actor);
}

function adminAdjust({ discordId, username, amountCents, actor, description = null }) {
  const user = userRepository.ensureUser(discordId, username);
  if (amountCents < 0 && user.balance_cents < Math.abs(amountCents)) {
    throw new InsufficientBalanceError('O usuário não possui saldo suficiente para este débito.');
  }
  userRepository.updateBalance(discordId, amountCents);
  return transactionRepository.createTransaction({
    discordId,
    type: amountCents >= 0 ? 'admin_credit' : 'admin_debit',
    amountCents: Math.abs(amountCents),
    status: 'completed',
    description,
    actor,
  });
}

function history(discordId, limit = 10) {
  return transactionRepository.listByUser(discordId, limit);
}

module.exports = {
  getBalance,
  createPendingDeposit,
  completeDeposit,
  failDeposit,
  requestWithdraw,
  completeWithdraw,
  cancelWithdraw,
  adminAdjust,
  history,
  InsufficientBalanceError,
};
