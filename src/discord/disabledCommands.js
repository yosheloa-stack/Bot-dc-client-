'use strict';

/**
 * Arquivos de comando que existem no repositório mas não são carregados
 * nem registrados no Discord.
 *
 * `passe.js` (e o serviço `services/passeService.js` que ele usa) envia
 * "Passe Booyah" para jogadores do Free Fire através de uma API de
 * terceiros (fluxggx.squareweb.app / autolikesystem.com.br) que monta seu
 * estoque a partir de usuário/senha de contas de Free Fire de outras
 * pessoas — não é uma integração oficial da Garena. Isso foi mantido no
 * repositório a pedido do dono do projeto, mas o registro automático de
 * comandos deste bot não deve ativá-lo sem uma decisão explícita e
 * separada de quem administra o servidor Discord.
 *
 * Para ativar mesmo assim, remova a entrada correspondente aqui.
 */
const DISABLED_COMMAND_FILES = new Set(['passe.js']);

module.exports = { DISABLED_COMMAND_FILES };
