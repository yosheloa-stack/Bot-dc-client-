# 🗡️ Ceifador — Bot de Discord com Saldo e Pix Automático

Bot de Discord com identidade visual dark (preto/cinza + vermelho sangue),
sistema de saldo com histórico de transações, cobrança Pix automática (QR
Code + Copia e Cola) e painel administrativo web para configurar a chave
Pix, acompanhar pagamentos e gerenciar usuários.

## Funcionalidades

- **Saldo automático**: consulta (`/saldo`), depósito via Pix (`/depositar`),
  retirada (`/sacar`) e histórico de transações (`/historico`).
- **Pix automático**: gera QR Code e Copia e Cola sob demanda. Com o
  provedor Mercado Pago, o saldo é liberado automaticamente assim que o
  pagamento é identificado (via webhook). Com o provedor manual, o Pix é
  gerado a partir da sua própria chave e a confirmação é feita pelo
  administrador no painel.
- **Painel administrativo web**: login protegido, configuração da chave
  Pix e do provedor, credenciais do Mercado Pago, cargo de administrador
  do Discord, listagem de usuários/saldos, histórico completo de
  pagamentos e gerenciamento de depósitos/retiradas pendentes.
- **Identidade visual "Ceifador"**: embeds do Discord e painel web em tema
  escuro com detalhes em vermelho sangue e uma foice estilizada como logo.

## Stack técnica

- [discord.js v14](https://discord.js.org/) para o bot.
- [express](https://expressjs.com/) + [EJS](https://ejs.co/) para o painel
  web (mesmo processo do bot).
- `node:sqlite` (nativo do Node.js 22+) como banco de dados — sem
  dependências nativas para instalar.
- [`pix-utils`](https://www.npmjs.com/package/pix-utils) para gerar o Pix
  estático (Copia e Cola + QR Code) no modo manual.
- API REST do Mercado Pago para o modo automático.

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

### Convite do bot

Ao gerar o link de convite no Discord Developer Portal, marque o escopo
`bot` e `applications.commands`, e conceda as permissões
`Send Messages`, `Embed Links`, `Attach Files` e `Use Slash Commands`
(mais `Manage Guild` para quem for usar `/admin`, controlado pelo próprio
Discord).

### Registrar os comandos de barra

```bash
npm run deploy-commands
```

### Rodar o bot + painel

```bash
npm start
```

O painel administrativo sobe junto, em `http://localhost:3000` (ou a porta
definida em `PORT`).

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

`/admin` fica visível por padrão apenas para quem tem a permissão
`Gerenciar Servidor`. Para liberar também para um cargo específico de
staff, defina `ADMIN_ROLE_ID` (ou configure pelo painel web) — o bot
verifica esse cargo internamente antes de executar qualquer subcomando.

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
- **Configurações**: chave Pix, provedor, credenciais do Mercado Pago,
  limites de depósito, cargo de admin e canal de log — tudo aplicado
  imediatamente, sem reiniciar o bot.

## Estrutura do projeto

```
src/
  config/env.js          Configuração (variáveis de ambiente + overrides do painel)
  database/               Schema e conexão SQLite (node:sqlite)
  repositories/            Acesso a dados (usuários, transações, configurações)
  services/
    balanceService.js      Regras de saldo (depósito, retirada, ajustes)
    pix/                   Provedores de Pix (manual, Mercado Pago)
  discord/
    client.js               Bootstrap do client discord.js
    commands/                Comandos de barra
    events/                  Handlers de evento
    embeds/theme.js          Tema visual "Ceifador" para os embeds
    notifier.js              DMs e avisos automáticos
  web/
    server.js                App Express (painel + webhook)
    routes/, views/, public/ Rotas, telas EJS e assets estáticos
assets/img/ceifador-logo.png Logo gerado (foice estilizada, tema Ceifador)
```

## Segurança

- Nunca commite o arquivo `.env` (já está no `.gitignore`).
- Troque `ADMIN_PANEL_PASSWORD` e `SESSION_SECRET` antes de publicar.
- O token do Mercado Pago só pode ser definido pelo painel web
  autenticado (não por comando de Discord), para evitar exposição em
  canais públicos.
- Em produção, sirva o painel atrás de HTTPS (ex: proxy reverso).
