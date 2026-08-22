'use strict';

/**
 * Arquivos de comando que existem no repositório mas não são carregados
 * nem registrados no Discord.
 *
 * O comando `passe.js` utiliza a KasaAPI configurada por `PASSE_API_KEY` e
 * `PASSE_API_BASE_URL`. Ele permanece separado desta lista para que a
 * integração possa ser desativada sem remover o código do projeto.
 */
const DISABLED_COMMAND_FILES = new Set();

module.exports = { DISABLED_COMMAND_FILES };
