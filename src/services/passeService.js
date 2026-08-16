'use strict';

const DEFAULT_BASE_URL = 'https://fluxggx.squareweb.app';
const REQUEST_TIMEOUT_MS = 15_000;

class PasseApiError extends Error {
  constructor(message, { status = 0, code = null, data = null } = {}) {
    super(message);
    this.name = 'PasseApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

function getApiConfig(config) {
  const apiKey = config?.passe?.apiKey?.trim();
  const baseUrl = (config?.passe?.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  if (!apiKey) throw new PasseApiError('A API de passe ainda não foi configurada.');
  return { apiKey, baseUrl };
}

function validatePlayerId(id) {
  const value = String(id || '').trim();
  if (!/^\d{5,20}$/.test(value)) {
    throw new PasseApiError('Informe um ID de jogador válido, com 5 a 20 números.', { code: 'BAD_ID' });
  }
  return value;
}

async function request(path, params, config) {
  const { apiKey, baseUrl } = getApiConfig(config);
  const url = new URL(path, `${baseUrl}/`);
  url.searchParams.set('key', apiKey);
  for (const [name, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(name, value);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  let data;
  try {
    response = await fetch(url, { method: 'GET', signal: controller.signal });
    data = await response.json().catch(() => ({}));
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new PasseApiError('A API de passe demorou demais para responder. Tente novamente.', { code: 'TIMEOUT' });
    }
    throw new PasseApiError('Não foi possível conectar à API de passe. Tente novamente.', { code: 'NETWORK' });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok || data?.sucesso === false || data?.status === 2) {
    const message = data?.mensagem || `A API de passe retornou HTTP ${response.status}.`;
    throw new PasseApiError(message, {
      status: response.status,
      code: data?.error || null,
      data,
    });
  }
  return data;
}

async function confirmPlayer(id, config) {
  return request('/passe/confirmar', { id: validatePlayerId(id) }, config);
}

async function sendPasse(id, config) {
  return request('/send-passe', { id: validatePlayerId(id) }, config);
}

async function getStock(config) {
  return request('/passe/estoque', {}, config);
}

async function getDays(config) {
  return request('/passe/dias', {}, config);
}

module.exports = {
  PasseApiError,
  confirmPlayer,
  sendPasse,
  getStock,
  getDays,
};
