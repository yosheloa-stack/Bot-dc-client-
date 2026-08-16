'use strict';

const ManualProvider = require('./ManualProvider');
const MercadoPagoProvider = require('./MercadoPagoProvider');
const EfiProvider = require('./EfiProvider');

function getPixProvider(config) {
  switch (config.pix.provider) {
    case 'mercadopago':
      return new MercadoPagoProvider(config);
    case 'efi':
      return new EfiProvider(config);
    case 'manual':
    default:
      return new ManualProvider(config);
  }
}

module.exports = { getPixProvider, ManualProvider, MercadoPagoProvider, EfiProvider };
