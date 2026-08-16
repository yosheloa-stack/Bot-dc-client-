'use strict';

function centsToBRL(cents) {
  return ((cents || 0) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function reaisToCents(value) {
  return Math.round(Number(value) * 100);
}

function formatDate(isoLike) {
  if (!isoLike) return '—';
  const date = new Date(`${isoLike.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return isoLike;
  return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

module.exports = { centsToBRL, reaisToCents, formatDate };
