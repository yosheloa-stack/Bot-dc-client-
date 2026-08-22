# 🗡️ Ceifador — Bot de Discord com Saldo e Pix Automático

Bot de Discord com identidade visual dark (preto/cinza + vermelho sangue),
sistema de saldo com histórico de transações e cobrança Pix automática
(QR Code + Copia e Cola). Tudo é operado por comandos de barra no
Discord — não existe painel web nem login. Só há um servidor HTTP
mínimo, sem interface nenhuma, que recebe as notificações de pagamento
do Mercado Pago/Efí.

## Funcionalidades

- **Saldo automático**: consulta (`/saldo`), depósito via Pix (`/depositar`),
  retirada (`/sacar`) e histórico de transações (`/historico`).
- **Pix automático**: gera QR Code e Copia e Cola sob demanda. Com o
  provedor Mercado Pago ou Efí Bank, o saldo é liberado automaticamente
  assim que o pagamento é identificado (via webhook). Com o provedor
  manual, o Pix é gerado a partir da sua própria chave e a confirmação é
  feita por um administrador com `/admin depositos confirmar`.
- **Administração 100% por Discord**: ajuste de saldo, configuração da
  chave/provedor de Pix, aprovação de depósitos/retiradas — tudo por
  `/admin`. Só o token do Mercado Pago e as credenciais da Efí ficam de
  fora dos comandos (por segurança) e são configurados por variável de
  ambiente.
- **Identidade visual "Ceifador"**: embeds do Discord em tema escuro com
  detalhes em vermelho sangue e uma ilustração do Ceifador como logo.

## Stack técnica

- [discord.js v14](https://discord.js.org/) para o bot.
- `node:sqlite` (nativo do Node.js 22+) como banco de dados — sem
  dependências nativas para instalar.
- [`pix-utils`](https://www.npmjs.com/package/pix-utils) para gerar o Pix
  estático (Copia e Cola + QR Code) no modo manual.
- API REST do Mercado Pago e da Efí Bank para os modos automáticos.
- `node:http` puro para o endpoint de webhook — sem framework web.

## Pré-requisitos

- Node.js **22.5+** (usa o módulo experimental `node:sqlite`).
- Uma aplicação/bot criada no [Discord Developer Portal](https://discord.com/developers/applications).
- (Opcional, para Pix 100% automático) uma conta no
  [Mercado Pago](https://www.mercadopago.com.br/developers) ou na
  [Efí Bank](https://sejaefi.com.br/).

## Instalação

```bash
npm install
cp .env.example .env
```

Preencha o `.env`:

1. `DISCORD_TOKEN` — em Discord Developer Portal → Bot → Token.
2. `PIX_KEY` — sua chave Pix, usada no modo manual.
3. `PASSE_API_KEY` e `PASSE_API_BASE_URL` — se for usar o comando `/passe`
   com a KasaAPI.
4. `MP_ACCESS_TOKEN` ou `EFI_CLIENT_ID`/`EFI_CLIENT_SECRET`/`EFI_CERT_PATH`
   — apenas se for usar Pix automático (ver [Modos de Pix](#modos-de-pix)).

### Intents privilegiadas

Nenhuma intent privilegiada é necessária — o bot só usa comandos de
barra, sem ler conteúdo de mensagem nem lista de membros.

### Convite do bot

Ao gerar o link de convite no Discord Developer Portal (OAuth2 → URL
Generator), use o escopo `bot` e conceda as permissões `Send Messages`,
`Embed Links`, `Attach Files` e `Use Slash Commands` (mais `Manage Guild`
para quem for usar `/admin`, controlado pelo próprio Discord). Nas
configurações atuais do Discord, a autorização de comandos de aplicação é
incluída por padrão na instalação de um bot; se o bot foi adicionado por um
convite antigo e os comandos não aparecem, gere o convite novamente com as
configurações de instalação atualizadas.

### Rodar o bot

```bash
npm start
```

**Os comandos de barra são registrados automaticamente depois que o bot
conecta** — não é preciso preencher Application ID, Guild ID ou rodar script
separado. O registro é global e o Discord pode levar algum tempo para
propagar os comandos na primeira publicação.

### Quando o bot está online, mas os comandos não aparecem

Confirme que `DISCORD_TOKEN` é o token atual do bot e que o processo está
usando a versão mais recente do projeto. Os comandos são publicados
globalmente, sem configuração de servidor de teste. Se o bot foi instalado
antes da configuração atual do Discord, refaça o convite pelo Developer
Portal. Depois do login, o log deve informar os nomes registrados. Os
comandos deste projeto são comandos de barra: escrever
`/saldo`, `/depositar`, `/historico`, `/sacar` ou `/admin` no campo de mensagem
é o fluxo esperado; não há comandos prefixados tradicionais.

Para validar localmente se os arquivos dos comandos estão corretos, execute:

```bash
npm test
```

Se `PIX_PROVIDER` for `mercadopago` ou `efi`, um servidor HTTP mínimo
(sem interface) também sobe, só para receber a notificação de pagamento
— ver [Modos de Pix](#modos-de-pix).

## Comandos do Discord

| Comando | Descrição |
|---|---|
| `/saldo [usuario]` | Mostra o saldo atual. Admins podem consultar o de outros usuários. |
| `/depositar valor` | Gera uma cobrança Pix (QR Code + Copia e Cola) para adicionar saldo. |
| `/sacar valor chave_pix` | Solicita uma retirada; o valor é reservado do saldo até um admin confirmar o envio. |
| `/historico` | Lista as últimas 10 transações do usuário. |
| `/admin saldo adicionar\|remover` | Ajusta o saldo de um usuário manualmente. |
| `/admin pix chave\|provedor\|ver\|webhook` | Configura/consulta a chave e o provedor de Pix; registra o webhook na Efí. |
| `/admin depositos listar\|confirmar\|falhou\|consultar` | Gerencia depósitos pendentes (essencial no modo manual). |
| `/admin saques listar\|concluir\|cancelar` | Gerencia solicitações de retirada pendentes. |
| `/passe enviar id` | Confere o jogador e, após confirmação, envia um Passe Booyah pela KasaAPI. |
| `/passe estoque` | Consulta o estoque da KasaAPI (admin). |
| `/passe dias` | Consulta a validade da key da KasaAPI (admin). |
| `/admin passe preco valor` | Define o preço unitário do passe. |
| `/admin passe ver` | Mostra o preço e o estado da configuração da venda. |

A integração do Passe Booyah usa a **KasaAPI** do repositório
[`yosheloa-stack/kasane-api-likes-Yosh`](https://github.com/yosheloa-stack/kasane-api-likes-Yosh).
Configure `PASSE_API_KEY` com uma key de cliente da KasaAPI e
`PASSE_API_BASE_URL` com a URL pública onde ela está publicada. O comando
`/passe enviar id` chama `/passe/confirmar` para mostrar o jogador e somente
chama `/send-passe` depois que o usuário clica em **Sim, enviar passe**.
Antes do envio, o bot verifica o saldo, reserva o preço configurado e só
conclui a venda quando a KasaAPI retorna `sucesso: true` e `status: 1`. Em
caso de falha ou cancelamento, o saldo é estornado. Os comandos
`/passe estoque` e `/passe dias` são restritos aos administradores. O preço
é definido com `/admin passe preco valor` (ex: `/admin passe preco valor:15`),
salvo no SQLite e aplicado imediatamente. A integração é habilitada no
registro automático dos comandos, mas só funciona depois que a key e a URL
da KasaAPI forem configuradas.

A KasaAPI precisa estar em execução e acessível pelo bot. No repositório da
KasaAPI, use `npm install`, configure `LIKES_API_PORT`/`PORT` e as credenciais
do serviço, e inicie com `npm start`. Para a API receber chamadas externas,
publique-a em uma URL HTTPS e use essa URL em `PASSE_API_BASE_URL`. Não
versione keys, senhas ou credenciais do serviço.

`/admin` fica visível por padrão apenas para quem tem a permissão
`Gerenciar Servidor`. Para liberar também para um cargo específico de
staff, defina `ADMIN_ROLE_ID` no `.env` — o bot verifica esse cargo
internamente antes de executar qualquer subcomando.

## Modos de Pix

### Manual (padrão, sem custos ou integrações)

Usa a chave Pix cadastrada (`PIX_KEY` no `.env`, ou depois via `/admin
pix chave`) para gerar um Pix estático válido (Copia e Cola + QR Code)
com valor e identificador únicos por cobrança. Como uma chave Pix
isolada não expõe uma API de extrato, **a confirmação do pagamento é
manual**: o administrador confere o recebimento no próprio banco e roda
`/admin depositos confirmar id:<id>` (o ID aparece em `/admin depositos
listar`), liberando o saldo para o usuário nesse momento. Se o pagamento
não chegar, `/admin depositos falhou` marca a cobrança como falha sem
liberar saldo.

### Mercado Pago (100% automático)

Defina `PIX_PROVIDER=mercadopago` e informe `MP_ACCESS_TOKEN` no `.env`.
O bot cria a cobrança diretamente pela API de pagamentos do Mercado Pago
e configura a URL de notificação (`PUBLIC_URL/webhook/mercadopago`).
Quando o pagamento é aprovado, o Mercado Pago chama esse webhook, o bot
confirma o pagamento pela API e libera o saldo automaticamente — sem
nenhuma ação manual. Configure a mesma URL de webhook no painel do
Mercado Pago (o próprio `.env`/`PUBLIC_URL` já define qual é essa URL:
`<PUBLIC_URL>/webhook/mercadopago`).

> Para o webhook funcionar, `PUBLIC_URL` precisa ser um endereço
> acessível publicamente (ex: seu domínio com HTTPS, ou um túnel como
> `ngrok`/`cloudflared` durante testes).

### Efí Bank (100% automático)

Defina `PIX_PROVIDER=efi` e informe `EFI_CLIENT_ID`/`EFI_CLIENT_SECRET`
(Efí > Minhas Aplicações) no `.env`. **Diferente do Mercado Pago, a API
Pix da Efí exige mTLS em toda chamada**: baixe o certificado `.p12` no
painel da própria Efí, salve-o em um caminho no servidor onde o bot roda
(fora do repositório — por exemplo `certs/efi.p12`, que já está no
`.gitignore`) e aponte `EFI_CERT_PATH` para esse arquivo. Se o
certificado tiver senha, informe em `EFI_CERT_PASSPHRASE`.

Depois de definir a chave Pix e as credenciais no `.env`, registre o
webhook uma única vez com `/admin pix webhook` — isso associa
`PUBLIC_URL/webhook/efi` à sua chave Pix na Efí. A partir daí, toda
cobrança criada por `/depositar` é confirmada automaticamente: o bot
recebe a notificação, reconsulta o status diretamente na API da Efí (o
corpo do webhook nunca é confiado sozinho) e libera o saldo.

Use `EFI_SANDBOX=true` para testar no ambiente de homologação da Efí
antes de ir para produção.

> **Segurança**: nunca cole Client ID/Secret ou o conteúdo do
> certificado em locais versionados pelo git — use apenas o `.env`
> (já ignorado). Se alguma credencial chegou a ser exposta (ex: colada
> em um chat), gere novas no painel da Efí antes de colocar o bot em
> produção.

### Retiradas (saques)

Não existe uma API genérica de "Pix automático de saída" sem que o bot
seja operado por uma instituição de pagamento licenciada. Por isso,
`/sacar` reserva o valor do saldo do usuário imediatamente e cria uma
solicitação pendente; o administrador realiza a transferência Pix pelo
próprio banco e marca a solicitação como concluída (`/admin saques
concluir`) ou cancela devolvendo o saldo (`/admin saques cancelar`).

## Estrutura do projeto

```
src/
  config/env.js          Configuração (variáveis de ambiente + overrides via /admin)
  database/               Schema e conexão SQLite (node:sqlite)
  repositories/            Acesso a dados (usuários, transações, configurações)
  services/
    balanceService.js      Regras de saldo (depósito, retirada, ajustes)
    pix/                   Provedores de Pix (manual, Mercado Pago, Efí)
  discord/
    client.js               Bootstrap do client discord.js
    commands/                Comandos de barra
    events/                  Handlers de evento
    embeds/theme.js          Tema visual "Ceifador" para os embeds
    notifier.js              DMs e avisos automáticos
  webhookServer.js          Servidor HTTP mínimo (sem interface) para os webhooks de Pix
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
```

- `MAIN=src/index.js` — mesmo entry point usado localmente (`npm start`).
- `VERSION=recommended` — a Square Cloud usa uma versão recente do
  Node.js (bem acima do mínimo 22.5 exigido pelo `node:sqlite`), então
  não precisa fixar uma versão específica.
- Sem `SUBDOMAIN`, o webhook não fica acessível publicamente — funciona
  para tudo no modo manual de Pix. Se for usar Mercado Pago ou Efí
  (confirmação automática), adicione `SUBDOMAIN=<algo-disponível>` pra
  gerar uma URL pública (`https://<algo>.squareweb.app`) e configure
  `PUBLIC_URL` com essa mesma URL nas Environment Variables.

### Passo a passo

1. **Não** inclua `node_modules/`, `.git/`, `data/` nem `.env` no zip —
   a Square Cloud instala as dependências do zero a partir do
   `package.json` e o `.env` local não deve viajar dentro do pacote.
2. Gere o zip do projeto (com o `squarecloud.app` na raiz) e envie pelo
   [Dashboard da Square Cloud](https://squarecloud.app) ou pela CLI deles.
3. Na aba **Environment Variables** do app (não no zip), cadastre as
   mesmas variáveis do `.env.example`: `DISCORD_TOKEN`,
   `PIX_KEY`, etc. Se você definiu `SUBDOMAIN`,
   configure também `PUBLIC_URL=https://ceifador.squareweb.app` (troque
   pelo subdomínio escolhido) para os links do webhook ficarem corretos.
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
> `SUBDOMAIN` está configurado; o webhook já lê `process.env.PORT`
> (`src/config/env.js`), então não precisa mexer em nada no código.

## Segurança

- Nunca commite o arquivo `.env` (já está no `.gitignore`).
- O token do Mercado Pago e as credenciais da Efí só podem ser definidos
  por variável de ambiente (não por comando de Discord), para evitar
  exposição em canais públicos — a linha "fulano usou /comando" aparece
  no canal mesmo quando a resposta é só para quem usou o comando.
- Não existe painel web, login ou porta exposta com interface: o único
  endpoint HTTP (`/webhook/mercadopago` e `/webhook/efi`) só aceita as
  notificações de pagamento dos dois provedores.
