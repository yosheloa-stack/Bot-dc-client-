'use strict';

const ManualProvider = require('./ManualProvider');
const MercadoPagoProvider = require('./MercadoPagoProvider');

function getPixProvider(config) {
  switch (config.pix.provider) {
    case 'mercadopago':
      return new MercadoPagoProvider(config);
    case 'manual':
    default:
      return new ManualProvider(config);
  }
}

module.exports = { getPixProvider, ManualProvider, MercadoPagoProvider };
