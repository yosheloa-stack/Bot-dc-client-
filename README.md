# 🗡️ Ceifador — Bot de Discord com Saldo, Pix, Moderação e Música

Bot de Discord com identidade visual dark (preto/cinza + vermelho sangue):
sistema de saldo com Pix automático, moderação automática de servidor
(anti-link, anti-spam, anti-NSFW, avisos), player de música e um painel
administrativo web para configurar tudo isso.

## Funcionalidades

- **Saldo automático**: consulta (`/saldo`), depósito via Pix (`/depositar`),
  retirada (`/sacar`) e histórico de transações (`/historico`).
- **Pix automático**: gera QR Code e Copia e Cola sob demanda. Com o
  provedor Mercado Pago ou Efí Bank, o saldo é liberado automaticamente
  assim que o pagamento é identificado (via webhook). Com o provedor
  manual, o Pix é gerado a partir da sua própria chave e a confirmação é
  feita pelo administrador no painel.
- **Moderação automática**: Anti-Link, Anti-Spam, Anti-NSFW (com detecção
  real de imagem/vídeo via Sightengine, opcional) e sistema de avisos com
  escalonamento de punição — tudo configurável por `/admin moderacao` e
  com log das ações num canal do servidor.
- **`/setup`**: provisiona cargos, categorias e canais do zero (ou
  reconfigura os que já existem), de forma idempotente.
- **Música**: toca do YouTube por nome, link ou playlist, com um painel de
  botões (pause, skip, back, volume, loop, shuffle, autoplay, stop).
- **`/painel`**: um painel de botões e formulários para usar o bot inteiro
  sem digitar slash commands.
- **Painel administrativo web**: login protegido, configuração da chave
  Pix e do provedor, credenciais do Mercado Pago/Efí, cargo de
  administrador do Discord, listagem de usuários/saldos, histórico
  completo de pagamentos e gerenciamento de depósitos/retiradas pendentes.
- **Identidade visual "Ceifador"**: embeds do Discord e painel web em tema
  escuro com detalhes em vermelho sangue e uma ilustração do Ceifador
  como logo.

## Stack técnica

- [discord.js v14](https://discord.js.org/) para o bot.
- [express](https://expressjs.com/) + [EJS](https://ejs.co/) para o painel
  web (mesmo processo do bot).
- `node:sqlite` (nativo do Node.js 22+) como banco de dados — sem
  dependências nativas para instalar.
- [`pix-utils`](https://www.npmjs.com/package/pix-utils) para gerar o Pix
  estático (Copia e Cola + QR Code) no modo manual.
- API REST do Mercado Pago e da Efí Bank para os modos automáticos.
- [`@discordjs/voice`](https://github.com/discordjs/voice) +
  [`play-dl`](https://www.npmjs.com/package/play-dl) +
  [`youtube-sr`](https://www.npmjs.com/package/youtube-sr) para música
  (com `opusscript`, sem dependências nativas para compilar).
- [Sightengine](https://sightengine.com/) (opcional) para detecção real de
  NSFW em imagens/vídeos.

## Pré-requisitos

- Node.js **22.5+** (usa o módulo experimental `node:sqlite`).
- Uma aplicação/bot criada no [Discord Developer Portal](https://discord.com/developers/applications).
- (Opcional, para Pix 100% automático) uma conta no
  [Mercado Pago](https://www.mercadopago.com.br/developers) com um
  Access Token.

## Instalação

```bash
npm install
cp .env.example .env
```

Preencha o `.env`:

1. `DISCORD_TOKEN` e `DISCORD_CLIENT_ID` — na página da sua aplicação no
   Discord Developer Portal.
2. `DISCORD_GUILD_ID` — ID do seu servidor de testes (para os comandos
   aparecerem instantaneamente durante o desenvolvimento). Remova antes de
   publicar globalmente.
3. `ADMIN_PANEL_USER` / `ADMIN_PANEL_PASSWORD` / `SESSION_SECRET` — login
   do painel web. **Troque os valores padrão.**
4. `PIX_KEY` — sua chave Pix, usada no modo manual.
5. `MP_ACCESS_TOKEN` — apenas se for usar `PIX_PROVIDER=mercadopago`.

### Intents privilegiadas (obrigatório para moderação e música)

A moderação automática precisa ler o conteúdo das mensagens e a lista de
membros do servidor — isso exige **intents privilegiadas**, que o Discord
mantém desligadas por padrão. Sem isso o bot falha ao conectar. No
[Discord Developer Portal](https://discord.com/developers/applications),
na aba **Bot**, ative:

- **Message Content Intent**
- **Server Members Intent**

(Presence Intent não é usado, pode deixar desligado.)

### Convite do bot

Ao gerar o link de convite (Developer Portal → OAuth2 → URL Generator),
marque os escopos `bot` e `applications.commands`, e conceda as
permissões: `Send Messages`, `Embed Links`, `Attach Files`,
`Use Slash Commands`, `Manage Roles`, `Manage Channels`,
`Manage Messages`, `Kick Members`, `Ban Members`, `Moderate Members`,
`Mention Everyone`, `Connect` e `Speak` (as três últimas são para
`/marcar` e para a música). `/convite` gera esse link pronto depois que
o bot já estiver rodando em pelo menos um servidor.

### Rodar o bot + painel

```bash
npm start
```

O painel administrativo sobe junto, em `http://localhost:3000` (ou a porta
definida em `PORT`). **Os comandos de barra são registrados
automaticamente toda vez que o bot inicia** — não é preciso rodar nada
separado, nem na Square Cloud nem em qualquer outro host. Se definir
`DISCORD_GUILD_ID`, o registro é instantâneo nesse servidor; sem ele, o
registro é global e o Discord pode levar até 1 hora para propagar os
comandos em todos os servidores na primeira vez.

Se preferir registrar manualmente (ex: só quer atualizar os comandos sem
reiniciar o bot), o script standalone continua disponível:

```bash
npm run deploy-commands
```

## Comandos do Discord

| Comando | Descrição |
|---|---|
| `/saldo [usuario]` | Mostra o saldo atual. Admins podem consultar o de outros usuários. |
| `/depositar valor` | Gera uma cobrança Pix (QR Code + Copia e Cola) para adicionar saldo. |
| `/sacar valor chave_pix` | Solicita uma retirada; o valor é reservado do saldo até um admin confirmar o envio. |
| `/historico` | Lista as últimas 10 transações do usuário. |
| `/admin saldo adicionar\|remover` | Ajusta o saldo de um usuário manualmente. |
| `/admin pix chave\|provedor\|ver` | Configura/consulta a chave e o provedor de Pix. |
| `/admin saques listar\|concluir\|cancelar` | Gerencia solicitações de retirada pendentes. |
| `/admin painel` | Mostra o link do painel administrativo. |
| `/setup` | Cria/reconfigura cargos, categorias e canais automaticamente (admin). |
| `/admin moderacao ver\|sistema\|acao\|canal-logs` | Configura Anti-Link, Anti-Spam, Anti-NSFW e Avisos. |
| `/avisos add\|ver\|limpar` | Gerencia avisos (warns) de um membro. |
| `/marcar [mensagem] [aqui]` | Marca @everyone ou @here com uma mensagem. |
| `/tocar musica` | Toca uma música/playlist do YouTube na call (nome ou link). |
| `/pular` `/pausar` `/retomar` `/parar` `/fila` | Controles de música. |
| `/painel` | Posta um painel de botões/formulários com todos os comandos acima. |
| `/convite` | Gera o link para adicionar o bot em outro servidor. |
| `/criador` | Mostra o criador do bot (usa `OWNER_ID`). |
| `/meuid [usuario]` | Mostra um ID do Discord pronto para copiar. |
| `/ping` | Latência do bot. |
| `/ajuda` | Lista todos os comandos. |
| `/passe enviar id` | *(desativado por padrão, ver nota abaixo)* Confere o jogador e, após confirmação, envia um Passe Booyah. |
| `/passe estoque` | *(desativado por padrão)* Consulta o estoque da API de passe (admin). |
| `/passe dias` | *(desativado por padrão)* Consulta a validade da chave da API de passe (admin). |
| `/admin passe preco valor` | Define o preço unitário do passe (afeta apenas o comando acima, que fica inativo por padrão). |
| `/admin passe ver` | Mostra o preço e o estado da configuração da venda. |

> **Nota:** `/passe` fica listado em `src/discord/commands/passe.js` mas é
> excluído do registro automático de comandos (`src/discord/disabledCommands.js`),
> então ele não aparece no Discord por padrão. A integração chama uma API
> de terceiros (`fluxggx.squareweb.app`) cujo mecanismo de "estoque" usa
> usuário/senha de contas de Free Fire de outras pessoas — não é um canal
> oficial da Garena. Isso não foi removido do repositório a pedido do
> autor do projeto, mas ativá-lo é uma decisão separada e explícita: para
> isso, remova `'passe.js'` de `DISABLED_COMMAND_FILES` nesse arquivo.

A integração da API de Passe Booyah usa `PASSE_API_KEY`, uma chave específica gerada no Painel de Passe e diferente da chave da API principal. O comando `/passe enviar id` primeiro consulta o jogador e somente envia o passe após o usuário clicar em **Sim, enviar passe**. Antes do envio, o bot verifica o saldo do cliente, reserva o preço configurado, chama a API e conclui a venda somente quando o retorno confirma o envio. Em caso de falha ou cancelamento, o saldo é estornado. Os comandos `/passe estoque` e `/passe dias` são restritos aos administradores.

O dono configura o preço diretamente pelo Discord usando `/admin passe preco valor`, por exemplo `/admin passe preco valor:15`. O valor é salvo no banco SQLite e aplicado imediatamente, sem reiniciar o bot. `/admin passe ver` mostra o preço atual e se a chave da API está configurada.

Configure `PASSE_API_KEY` e, opcionalmente, `PASSE_API_BASE_URL=https://fluxggx.squareweb.app` nas variáveis de ambiente da hospedagem. Nunca coloque a chave real no código, no `.env.example`, em commits ou em mensagens públicas. Se a chave tiver sido compartilhada com terceiros, gere uma nova no Painel de Passe.

`/admin` fica visível por padrão apenas para quem tem a permissão
`Gerenciar Servidor`. Para liberar também para um cargo específico de
staff, defina `ADMIN_ROLE_ID` (ou configure pelo painel web) — o bot
verifica esse cargo internamente antes de executar qualquer subcomando.

## Moderação automática

Cada servidor tem sua própria configuração (tabela `guild_settings`),
criada com os padrões abaixo assim que o bot entra nele:

- **Anti-Link**: apaga/pune links não permitidos. Cargos "Ceifador Admin"
  e "Moderador" (criados pelo `/setup`) sempre podem enviar links; a
  whitelist de domínios e a lista de cargos liberados ficam em
  `src/moderation/defaults.js`.
- **Anti-Spam**: detecta flood (muitas mensagens em pouco tempo) e
  mensagens repetidas.
- **Anti-NSFW**: bloqueia texto, links e nomes de figurinha explícitos
  por um filtro heurístico. Para detecção real de imagens/vídeos
  (não só nome de arquivo), configure `SIGHTENGINE_API_USER` e
  `SIGHTENGINE_API_SECRET` — sem isso, mídia só é barrada se
  `blockMediaOutsideNsfw` estiver ligado.
- **Avisos**: acumula avisos por membro; ao atingir o limite configurado,
  aplica a punição automaticamente (padrão: kick aos 3 avisos).

Ajuste tudo com `/admin moderacao` (ver/sistema/acao/canal-logs) ou rode
`/setup` primeiro para já ganhar os cargos, categorias, canais e o canal
de logs prontos.

## Música

`/tocar` funciona direto com `play-dl` (biblioteca padrão do ecossistema
discord.js), sem nenhuma configuração extra. Duas melhorias opcionais,
ambas em `.env`:

- `YOUTUBE_API_KEY` — usa a YouTube Data API oficial para busca/playlist
  (mais confiável que scraping em hospedagens na nuvem).
- `YOUTUBE_COOKIE` — cookie de uma conta logada, reduz o bloqueio
  "Sign in to confirm you're not a bot" que o YouTube aplica a IPs de
  datacenter.

`YTAUDIO_API_URL`/`YTAUDIO_API_KEY` só existem para quem já tem (ou
hospeda) sua própria API de download de áudio como contorno adicional —
não vêm com nenhum serviço de terceiros pré-configurado.

## Modos de Pix

### Manual (padrão, sem custos ou integrações)

Usa a chave Pix cadastrada (`PIX_KEY` ou pelo painel) para gerar um Pix
estático válido (Copia e Cola + QR Code) com valor e identificador únicos
por cobrança. Como uma chave Pix isolada não expõe uma API de extrato,
**a confirmação do pagamento é manual**: o administrador confere o
recebimento no próprio banco e clica em "Confirmar" na aba *Transações*
do painel (ou usa `/admin saques concluir`/`/admin` conforme o caso), e o
saldo é liberado automaticamente para o usuário nesse momento.

### Mercado Pago (100% automático)

Defina `PIX_PROVIDER=mercadopago` e informe `MP_ACCESS_TOKEN`. O bot cria
a cobrança diretamente pela API de pagamentos do Mercado Pago e configura
a URL de notificação (`PUBLIC_URL/webhook/mercadopago`). Quando o
pagamento é aprovado, o Mercado Pago chama esse webhook, o bot confirma o
pagamento pela API e libera o saldo automaticamente — sem nenhuma ação
manual. Configure a mesma URL de webhook no painel do Mercado Pago (o
próprio painel administrativo do Ceifador mostra a URL correta em
*Configurações*).

> Para o webhook funcionar, `PUBLIC_URL` precisa ser um endereço
> acessível publicamente (ex: seu domínio com HTTPS, ou um túnel como
> `ngrok`/`cloudflared` durante testes).

### Efí Bank (100% automático)

Defina `PIX_PROVIDER=efi` e informe `EFI_CLIENT_ID`/`EFI_CLIENT_SECRET`
(Efí > Minhas Aplicações). **Diferente do Mercado Pago, a API Pix da Efí
exige mTLS em toda chamada**: baixe o certificado `.p12` no painel da Efí,
salve-o em um caminho no servidor onde o bot roda (fora do repositório —
por exemplo `certs/efi.p12`, que já está no `.gitignore`) e aponte
`EFI_CERT_PATH` para esse arquivo. Se o certificado tiver senha, informe
em `EFI_CERT_PASSPHRASE`.

Depois de salvar a chave Pix e as credenciais (pelo `.env` ou pelo painel,
em *Configurações*), registre o webhook uma única vez clicando em
**"Registrar webhook na Efí"** na mesma página — isso associa
`PUBLIC_URL/webhook/efi` à sua chave Pix na Efí. A partir daí, toda
cobrança criada por `/depositar` é confirmada automaticamente: o bot
recebe a notificação, reconsulta o status diretamente na API da Efí (o
corpo do webhook nunca é confiado sozinho) e libera o saldo.

Use `EFI_SANDBOX=true` para testar no ambiente de homologação da Efí
antes de ir para produção.

> **Segurança**: nunca cole Client ID/Secret ou o conteúdo do
> certificado em locais versionados pelo git — use apenas o `.env`
> (já ignorado) ou o painel administrativo, que grava tudo no SQLite
> local (pasta `data/`, também ignorada). Se alguma credencial chegou a
> ser exposta (ex: colada em um chat), gere novas no painel da Efí antes
> de colocar o bot em produção.

### Retiradas (saques)

Não existe uma API genérica de "Pix automático de saída" sem que o bot
seja operado por uma instituição de pagamento licenciada. Por isso,
`/sacar` reserva o valor do saldo do usuário imediatamente e cria uma
solicitação pendente; o administrador realiza a transferência Pix pelo
próprio banco e marca a solicitação como concluída (ou cancela,
devolvendo o saldo) pelo painel ou por `/admin saques`.

## Painel administrativo

Acesse `PUBLIC_URL` (ou `http://localhost:PORT`) e faça login com
`ADMIN_PANEL_USER`/`ADMIN_PANEL_PASSWORD`. Nele você encontra:

- **Painel**: métricas gerais (usuários, saldo em circulação, pendências).
- **Usuários**: busca e ajuste manual de saldo.
- **Transações**: histórico completo, com filtros por status/tipo e ações
  para confirmar/cancelar depósitos e retiradas pendentes.
- **Configurações**: chave Pix, provedor (manual, Mercado Pago ou Efí),
  credenciais e certificado da Efí, token do Mercado Pago, limites de
  depósito, cargo de admin e canal de log — tudo aplicado imediatamente,
  sem reiniciar o bot.

## Estrutura do projeto

```
src/
  config/env.js          Configuração (variáveis de ambiente + overrides do painel)
  database/               Schema e conexão SQLite (node:sqlite)
  repositories/            Acesso a dados (usuários, transações, moderação, configurações)
  services/
    balanceService.js      Regras de saldo (depósito, retirada, ajustes)
    pix/                   Provedores de Pix (manual, Mercado Pago, Efí)
  moderation/              Anti-Link, Anti-Spam, Anti-NSFW, avisos, vision API (Sightengine)
  music/                   Player de música (GuildPlayer, manager, YouTube)
  discord/
    client.js               Bootstrap do client discord.js
    commands/                Comandos de barra
    events/                  Handlers de evento (interações, mensagens, novo servidor)
    embeds/theme.js          Tema visual "Ceifador" para os embeds
    panel/menu.js            Painel de botões/formulários (/painel)
    disabledCommands.js      Comandos presentes no repo mas fora do registro automático
    notifier.js              DMs e avisos automáticos
  web/
    server.js                App Express (painel + webhook)
    routes/, views/, public/ Rotas, telas EJS e assets estáticos
assets/img/ceifador-logo.jpg  Logo do bot (ilustração do Ceifador)
```

## Deploy na Square Cloud

O projeto já inclui o arquivo `squarecloud.app` na raiz — é o que a Square
Cloud lê para saber como rodar a aplicação:

```
DISPLAY_NAME=Ceifador
DESCRIPTION=Bot de Discord com saldo e Pix automatico
MAIN=src/index.js
MEMORY=512
VERSION=recommended
AUTORESTART=true
SUBDOMAIN=ceifador
```

- `MAIN=src/index.js` — mesmo entry point usado localmente (`npm start`).
- `VERSION=recommended` — a Square Cloud usa uma versão recente do
  Node.js (bem acima do mínimo 22.5 exigido pelo `node:sqlite`), então
  não precisa fixar uma versão específica.
- `SUBDOMAIN=ceifador` — gera uma URL pública (`https://ceifador.squareweb.app`)
  para o painel administrativo e os webhooks do Pix. Troque por um nome
  disponível; se remover essa linha, o painel/webhook não ficam expostos
  publicamente (ok se você só quiser os comandos do Discord).

### Passo a passo

1. **Não** inclua `node_modules/`, `.git/`, `data/` nem `.env` no zip —
   a Square Cloud instala as dependências do zero a partir do
   `package.json` e o `.env` local não deve viajar dentro do pacote.
2. Gere o zip do projeto (com o `squarecloud.app` na raiz) e envie pelo
   [Dashboard da Square Cloud](https://squarecloud.app) ou pela CLI deles.
3. Na aba **Environment Variables** do app (não no zip), cadastre as
   mesmas variáveis do `.env.example`: `DISCORD_TOKEN`,
   `DISCORD_CLIENT_ID`, `PIX_KEY`, `ADMIN_PANEL_PASSWORD`,
   `SESSION_SECRET`, etc. Se você definiu `SUBDOMAIN`, configure também
   `PUBLIC_URL=https://ceifador.squareweb.app` (troque pelo subdomínio
   escolhido) para os links do webhook ficarem corretos.
4. Se for usar Efí Bank, o certificado `.p12` precisa existir no
   servidor da Square Cloud — envie-o pelo file explorer do dashboard
   para um caminho como `certs/efi.p12` e aponte `EFI_CERT_PATH` para
   esse caminho nas variáveis de ambiente.
5. Suba o app pelo dashboard. O bot registra os comandos de barra
   sozinho a cada início — não precisa rodar nada manualmente. Com
   `AUTORESTART=true`, ele também reinicia sozinho se cair.
6. Confira: o bot precisa aparecer **Online** na lista de membros do
   servidor. Se aparecer offline, o processo não subiu — veja o console
   da Square Cloud para o erro (geralmente `DISCORD_TOKEN` errado/ausente
   nas Environment Variables). Se aparecer online mas os comandos não
   surgirem ao digitar `/`, confira se o bot foi convidado com o escopo
   `applications.commands` (veja a seção *Convite do bot* acima) — sem
   ele, o Discord nunca mostra os comandos, mesmo registrados.

> A Square Cloud injeta a variável `PORT` automaticamente quando
> `SUBDOMAIN` está configurado; o painel já lê `process.env.PORT`
> (`src/config/env.js`), então não precisa mexer em nada no código.

## Segurança

- Nunca commite o arquivo `.env` (já está no `.gitignore`).
- Troque `ADMIN_PANEL_PASSWORD` e `SESSION_SECRET` antes de publicar.
- O token do Mercado Pago só pode ser definido pelo painel web
  autenticado (não por comando de Discord), para evitar exposição em
  canais públicos.
- Em produção, sirva o painel atrás de HTTPS (ex: proxy reverso).
