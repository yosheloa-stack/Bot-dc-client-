# Achados sobre comandos Discord

## Discord OAuth2 oficial
Fonte: https://docs.discord.com/developers/topics/oauth2

A documentação oficial descreve o fluxo de autorização de bots com o escopo `bot` e informa que o parâmetro `applications.commands` pode ser usado para comandos de aplicação; na configuração atual do Discord, esse escopo é incluído por padrão com `bot` nas configurações de instalação. Portanto, exigir que o usuário monte manualmente os dois escopos pode ser uma explicação incompleta ou desatualizada, embora seja importante verificar se a instalação efetiva do bot tem autorização para comandos.

## Guia do discord.js
Fonte: https://discordjs.guide/legacy/app-creation/deploying-commands

O padrão comum tem três partes: arquivos de comando com `data` e `execute`, um handler de comandos/interações e um script separado de deploy usando `REST` com `Routes.applicationGuildCommands(clientId, guildId)` durante desenvolvimento. O guia recomenda comandos de servidor para desenvolvimento porque aparecem imediatamente; comandos globais usam `Routes.applicationCommands(clientId)` e têm propagação mais lenta. O guia também afirma que o registro pode ser executado separadamente quando os comandos mudam, em vez de necessariamente a cada inicialização do bot.

## Implicação para o bot atual

O projeto já tem as três partes principais e carrega cinco comandos ativos. Ele, porém, registra comandos automaticamente em todo boot e permite cair para escopo global quando `DISCORD_GUILD_ID` está vazio. O sintoma relatado é compatível com falha de deploy, ID de aplicação/servidor incorreto ou publicação global ainda não propagada; não é evidência suficiente de que o listener `interactionCreate` esteja errado.

## Template público discord.js v14
Fonte: https://github.com/TFAGaming/DiscordJS-V14-Bot-Template

O template público confirma a arquitetura comum de separar comandos, componentes e eventos em módulos. A página não expõe o conteúdo dos arquivos no texto extraído, mas o projeto se apresenta como um template de handlers para discord.js v14, reforçando que essa organização é padrão e não uma exigência específica do bot atual.

## Intents e comandos por texto
Fonte: https://discordjs.guide/legacy/popular-topics/intents

Para receber mensagens pelo evento `messageCreate`, o guia informa que são necessárias as intents `Guilds` e `GuildMessages`, além da intent privilegiada `MessageContent` para receber o conteúdo das mensagens. Isso explica por que um bot que só possui `Guilds` e só trata `interactionCreate` não responderá a comandos escritos como `!saldo` ou `saldo`; ele foi projetado exclusivamente para slash commands.

## Conclusão preliminar

A configuração atual não é totalmente absurda, mas mistura duas estratégias: registra comandos automaticamente no boot e, ao mesmo tempo, usa um fluxo de desenvolvimento que normalmente registra comandos de guilda em script separado. A simplificação mais segura é usar `DISCORD_GUILD_ID` durante desenvolvimento e registrar comandos explicitamente, deixando o bot apenas iniciar e responder depois do deploy bem-sucedido. Não é necessário adicionar intents privilegiadas se o produto continuar usando somente `/comandos`.
