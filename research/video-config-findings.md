# Vídeos para configurar comandos Discord

## Recomendação principal em português

**SLASH COMMANDS - Discord.JS | Bots de Discord com JavaScript** — Square Cloud
https://www.youtube.com/watch?v=uqQ6QD6UXvQ

O vídeo é em português, usa Discord.JS/JavaScript e foi publicado em 25 de março de 2026. A descrição informa que ensina a criar slash commands para bots em Discord.JS. É o mais compatível com o projeto atual.

## Complemento em português

**SLASH COMMANDS! - Como Criar Bot de Discord com Python** — Lan Code
https://www.youtube.com/watch?v=H1RQl9NpNsA

O vídeo é em português e cobre sincronização de comandos, mas usa Python, não JavaScript. Serve para entender o conceito e a configuração do Discord, mas não para copiar código para este repositório.

## Referência técnica em inglês

**Register and Run Slash Commands (Discord.js v14)** — Under Ctrl
https://www.youtube.com/watch?v=2CsSJshmadg

O vídeo tem cerca de 10 minutos e trata diretamente do registro e execução de slash commands em Discord.js v14. É uma boa referência caso o vídeo em português não mostre algum detalhe.

## Vídeo de introdução em inglês

**How to make a Discord Bot for Beginners (Discord.js v14)** — Under Ctrl
https://www.youtube.com/watch?v=KZ3tIGHU314

Cobre a criação inicial da aplicação no Discord Developer Portal e a estrutura básica de um bot Discord.js v14.

## Diagnóstico para este projeto

O projeto `yosheloa-stack/Bot-dc-client-` já usa JavaScript e Discord.js v14. Ele não precisa de comandos escritos com prefixo; deve-se testar digitando `/saldo` no campo de mensagem. A alteração mais recente registra os comandos globalmente, sem `DISCORD_GUILD_ID`, usando `DISCORD_TOKEN` e `DISCORD_CLIENT_ID`. A conta deve estar configurada/reiniciada e a publicação global pode demorar para aparecer.
