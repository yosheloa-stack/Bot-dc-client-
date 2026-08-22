'use strict';

const DEFAULT_BASE_URL = 'https://fluxggx.squareweb.app';
const REQUEST_TIMEOUT_MS = 30_000;

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
  const region = String(config?.passe?.region || 'BR').trim().toUpperCase() || 'BR';

  if (!apiKey) throw new PasseApiError('A KasaAPI ainda não foi configurada.');
  if (!/^https?:\/\//i.test(baseUrl)) {
    throw new PasseApiError('A URL da KasaAPI é inválida.', { code: 'BAD_BASE_URL' });
  }

  return { apiKey, baseUrl, region };
}

function validatePlayerId(id) {
  const value = String(id || '').trim();
  if (!/^\d{5,20}$/.test(value)) {
    throw new PasseApiError('Informe um ID de jogador válido, com 5 a 20 números.', { code: 'BAD_ID' });
  }
  return value;
}

function responseMessage(data, status) {
  if (data && typeof data === 'object') {
    return data.mensagem || data.message || data.error || `A KasaAPI retornou HTTP ${status}.`;
  }

  return `A KasaAPI retornou HTTP ${status}.`;
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
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    data = await response.json().catch(() => ({}));
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new PasseApiError('A KasaAPI demorou demais para responder. Tente novamente.', { code: 'TIMEOUT' });
    }
    throw new PasseApiError('Não foi possível conectar à KasaAPI. Tente novamente.', { code: 'NETWORK' });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok || data?.sucesso === false || data?.status === 2) {
    throw new PasseApiError(responseMessage(data, response.status), {
      status: response.status,
      code: data?.error || null,
      data,
    });
  }

  return data;
}

function assertApiSuccess(data, operation) {
  if (data?.sucesso !== true || data?.status !== 1) {
    throw new PasseApiError(
      responseMessage(data, 200) || `A KasaAPI não confirmou ${operation}.`,
      { status: 200, code: data?.error || 'UNCONFIRMED', data }
    );
  }
  return data;
}

async function confirmPlayer(id, config) {
  const playerId = validatePlayerId(id);
  const { region } = getApiConfig(config);
  const data = assertApiSuccess(
    await request('/passe/confirmar', { id: playerId, region }, config),
    'a consulta do jogador'
  );

  return {
    ...data,
    id: String(data.id || playerId),
    nickname: data.nickname || data.nick || 'Não informado',
    nivel: data.nivel ?? null,
    regiao: data.regiao || region,
  };
}

async function sendPasse(id, config) {
  const playerId = validatePlayerId(id);
  return assertApiSuccess(
    await request('/send-passe', { id: playerId }, config),
    'o envio do passe'
  );
}

async function getStock(config) {
  return assertApiSuccess(await request('/passe/estoque', {}, config), 'a consulta do estoque');
}

async function getDays(config) {
  return assertApiSuccess(await request('/passe/dias', {}, config), 'a consulta da validade');
}

module.exports = {
  PasseApiError,
  confirmPlayer,
  sendPasse,
  getStock,
  getDays,
};
