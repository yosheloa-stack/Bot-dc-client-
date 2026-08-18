'use strict';

const TYPE_LABELS = {
  deposit: 'Depósito',
  withdraw: 'Retirada',
  admin_credit: 'Ajuste (crédito)',
  admin_debit: 'Ajuste (débito)',
  passe: 'Venda de passe',
};

const STATUS_LABELS = {
  pending: 'Pendente',
  completed: 'Concluído',
  failed: 'Falhou',
  cancelled: 'Cancelado',
};

function typeLabel(type) {
  return TYPE_LABELS[type] || type;
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

module.exports = { TYPE_LABELS, STATUS_LABELS, typeLabel, statusLabel };
