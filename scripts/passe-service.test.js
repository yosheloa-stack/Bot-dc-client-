'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const { test } = require('node:test');
const passeService = require('../src/services/passeService');

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve(`http://127.0.0.1:${port}`);
    });
  });
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

test('consome confirmação, envio, estoque e validade no contrato da KasaAPI', async (t) => {
  const requests = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    requests.push({ pathname: url.pathname, key: url.searchParams.get('key'), id: url.searchParams.get('id'), region: url.searchParams.get('region') });

    if (url.searchParams.get('key') === 'fail' && url.pathname === '/send-passe') {
      return json(res, 409, {
        sucesso: false,
        status: 2,
        error: 'SEM_ESTOQUE',
        mensagem: 'Sem estoque.',
        estoque: 0,
      });
    }

    if (url.pathname === '/passe/confirmar') {
      return json(res, 200, {
        sucesso: true,
        status: 1,
        id: url.searchParams.get('id'),
        nickname: 'Jogador Teste',
        nivel: 65,
        regiao: url.searchParams.get('region'),
        likes: 1234,
      });
    }

    if (url.pathname === '/send-passe') {
      return json(res, 200, {
        sucesso: true,
        status: 1,
        passe: 'Passe Booyah',
        id: url.searchParams.get('id'),
        estoque_restante: 2,
      });
    }

    if (url.pathname === '/passe/estoque') {
      return json(res, 200, {
        sucesso: true,
        status: 1,
        estoque: 2,
        passes_disponiveis: 2,
        contas_adicionadas: 2,
        enviados: 1,
      });
    }

    if (url.pathname === '/passe/dias') {
      return json(res, 200, {
        sucesso: true,
        status: 1,
        dias_restantes: 27,
        ilimitada: false,
        expira: '2026-08-23T00:00:00.000Z',
      });
    }

    return json(res, 404, { sucesso: false, status: 2, error: 'NOT_FOUND', mensagem: 'Rota não encontrada.' });
  });

  const baseUrl = await listen(server);
  t.after(() => server.close());
  const config = { passe: { apiKey: 'test-key', baseUrl, region: 'br' } };

  const player = await passeService.confirmPlayer('123456789', config);
  assert.deepEqual(
    { id: player.id, nickname: player.nickname, nivel: player.nivel, regiao: player.regiao },
    { id: '123456789', nickname: 'Jogador Teste', nivel: 65, regiao: 'BR' }
  );

  const sent = await passeService.sendPasse('123456789', config);
  assert.equal(sent.sucesso, true);
  assert.equal(sent.status, 1);
  assert.equal(sent.estoque_restante, 2);

  const stock = await passeService.getStock(config);
  assert.equal(stock.passes_disponiveis, 2);

  const days = await passeService.getDays(config);
  assert.equal(days.dias_restantes, 27);

  assert.deepEqual(requests, [
    { pathname: '/passe/confirmar', key: 'test-key', id: '123456789', region: 'BR' },
    { pathname: '/send-passe', key: 'test-key', id: '123456789', region: null },
    { pathname: '/passe/estoque', key: 'test-key', id: null, region: null },
    { pathname: '/passe/dias', key: 'test-key', id: null, region: null },
  ]);
});

test('propaga o erro SEM_ESTOQUE da KasaAPI sem confirmar a venda', async (t) => {
  const server = http.createServer((req, res) => json(res, 409, {
    sucesso: false,
    status: 2,
    error: 'SEM_ESTOQUE',
    mensagem: 'Sem estoque.',
  }));
  const baseUrl = await listen(server);
  t.after(() => server.close());

  await assert.rejects(
    () => passeService.sendPasse('123456789', { passe: { apiKey: 'fail', baseUrl } }),
    (err) => err.name === 'PasseApiError' && err.status === 409 && err.code === 'SEM_ESTOQUE' && err.message === 'Sem estoque.'
  );
});

test('rejeita IDs fora do formato aceito pela KasaAPI', async () => {
  await assert.rejects(
    () => passeService.confirmPlayer('abc', { passe: { apiKey: 'test-key', baseUrl: 'http://127.0.0.1:1' } }),
    (err) => err.name === 'PasseApiError' && err.code === 'BAD_ID'
  );
});
