# 🧩 PROJETO: STOP ONLINE

**Versão:** MVP v1.0
**Stack:** Node.js + Express + Supabase + Socket.IO + React + Vite

### Rode esses comandos para clonar o projeto e rodar

```bash
git clone https://github.com/USER/projeto-stop.git
cd projeto-stop

cd backend
npm install
# .env já está incluso; se precisar, edite as variáveis (Supabase, porta, etc.)
npm run dev
# API em http://localhost:3001

cd frontend
npm install
# .env já está incluso com VITE_API_BASE_URL apontando para o backend
npm run dev
# App em http://localhost:5173
```

## 1. 🏗️ Arquitetura e Tecnologias

| Camada                        | Tecnologia                              | Descrição                                                                                              |
| :---------------------------- | :-------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| **Frontend (Client)**         | React + Vite + Axios + Socket.IO Client | Interface do jogador. Gerencia login, salas, rodadas, placar e comunicação em tempo real.              |
| **Backend (Server)**          | Node.js + Express + Socket.IO Server    | Fornece APIs REST e controla o fluxo do jogo em tempo real via WebSocket.                              |
| **Banco de Dados**            | Supabase (PostgreSQL)                   | Armazena usuários, salas, rodadas, temas, respostas, pontuações e dicionário de palavras.              |
| **Autenticação**              | JWT (via Supabase Auth)                 | Login e persistência de sessão dos jogadores.                                                          |
| **Comunicação em Tempo Real** | Socket.IO                               | Sincroniza eventos entre os dois jogadores: início de partida, cronômetro, botão STOP, pontuação, etc. |
| **Hospedagem**                | Localhost / Supabase                    | Backend e frontend rodam localmente para o MVP; banco gerenciado via Supabase.                         |
| **Estilo e Build**            | TailwindCSS (opcional) + Vite           | Criação rápida de interface moderna e responsiva.                                                      |

📘 **Arquitetura:**

* **Camada REST** → controla autenticação, criação de salas, envio de respostas e lógica de pontuação.
* **Camada WebSocket** → mantém os dois navegadores sincronizados em tempo real (rounds, timer, STOP, placar).
* **Camada de Persistência** → banco Supabase garante consistência e integridade dos dados (FKs, status, unique constraints).

---

## 2. 📁 Estrutura de Pastas (comentada)

```
projeto-stop/
│
├── backend/
│   ├── src/
│   │   ├── server.js              # Ponto de entrada do backend. Inicializa Express + Socket.IO.
│   │   ├── sockets.js             # Gerencia eventos em tempo real (round:start, round:stop, etc).
│   │   └── ...                    # Demais arquivos utilitários internos.
│   │
│   ├── routes/
│   │   ├── auth.js                # Login e criação de usuário.
│   │   ├── rooms.js               # Criação e entrada em salas.
│   │   ├── answers.js             # Recebe respostas dos jogadores via POST.
│   │   ├── matches.js             # Inicia partidas, sorteia rodadas, letras e temas.
│   │   └── shop.js (Sprint 2)     # API da loja e power-ups.
│   │
│   ├── services/
│   │   ├── supabase.js            # Conexão centralizada com o Supabase.
│   │   ├── game.js                # Regras principais: rounds, scoring, letras sem repetição.
│   │   └── scoring.js (futuro)    # Módulo de pontuação com validação via dicionário.
│   │
│   ├── package.json               # Dependências e scripts (npm run dev).
│   └── .env                       # Variáveis de ambiente (chaves Supabase, porta, etc).
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginScreen.jsx    # Tela de login e cadastro de usuário.
│   │   │   ├── LobbyScreen.jsx    # Tela para criar/entrar em sala.
│   │   │   └── GameScreen.jsx     # Tela principal da partida (rodadas, STOP, placar).
│   │   │
│   │   ├── components/
│   │   │   ├── CategoryRow.jsx    # Linha de input para tema da rodada.
│   │   │   ├── RoundScoreTable.jsx# (futuro) tabela de placar por tema.
│   │   │   └── PowerUpButton.jsx  # (futuro) botão de uso de power-ups.
│   │   │
│   │   ├── lib/
│   │   │   ├── api.js             # Axios configurado com baseURL e interceptor de token.
│   │   │   └── socket.js          # Inicializa e exporta o socket conectado ao servidor.
│   │   │
│   │   ├── assets/                # Logos, imagens e estilos.
│   │   └── main.jsx               # Ponto de entrada React.
│   │
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── sql/
    ├── schema.sql                 # Estrutura completa das tabelas.
    ├── seed_temas.sql             # Povoa temas e letras (A-Z).
    └── seed_respostas.sql         # Dicionário de palavras válidas por tema/letra.
```

---

## 3. ⚙️ Fluxo do Backend (Visão Geral)

```
[Frontend] -> (HTTP) -> [Express Router] -> [Serviços] -> [Supabase DB]
                             ↓
                       [Socket.IO Server]
                             ↑
                       Eventos em tempo real
```

### Passo a passo:

1. **Autenticação**:

   * `POST /auth/register` → cria jogador no Supabase.
   * `POST /auth/login` → retorna token e `jogador_id`.

2. **Criação e entrada em sala**:

   * `POST /rooms` → cria nova sala.
   * `POST /rooms/join` → adiciona jogador à sala existente.

3. **Início da partida** (`/matches/start`):

   * Sorteia **letras sem repetição** (`pickLettersNoRepeat`).
   * Escolhe 4 temas aleatórios.
   * Cria 5 rodadas com status `ready`.
   * Emite via **Socket.IO**:

     * `round:ready` → envia rodada aos dois jogadores.
     * `round:started` → inicia contagem regressiva de 20s.

4. **Durante a rodada**:

   * Jogadores enviam respostas com `POST /answers`.
   * Quando alguém clica em STOP ou o tempo acaba:

     * Servidor emite `round:stopping` (trava inputs).
     * Aguarda 3s (`GRACE_MS`).
     * Executa `endRoundAndScore()`:

       * Garante placeholders.
       * Calcula pontuação A vs B (0/5/10).
       * Atualiza totais.
     * Emite `round:end` e `round:ready` da próxima rodada.

5. **Fim da partida**:

   * Após última rodada, emite `match:end` com totais e vencedor.
   * Frontend mostra resumo final.

---

## 4. 🖥️ Fluxo do Frontend (Visão Geral)

```
[LoginScreen] → [LobbyScreen] → [GameScreen]
```

### 🔐 LoginScreen.jsx

* Formulário → `api.post('/auth/login')`
* Armazena `token` + `meuJogadorId` no `localStorage`
* Redireciona para lobby

### 🏠 LobbyScreen.jsx

* Cria ou entra em sala (`/rooms` ou `/rooms/join`)
* Chama `joinRoom(salaId)` (via socket)
* Espera o host clicar “Iniciar Partida”

### 🎮 GameScreen.jsx

* Recebe `round:ready` → renderiza inputs.
* Recebe `round:started` → inicia contagem (timeLeft).
* Cada input dispara `autosaveAnswer()` → `/answers`.
* Clicar STOP:

  1. `setIsLocked(true)` (trava instantaneamente).
  2. Envia respostas pendentes.
  3. Emite `round:stop` via socket.
* Recebe `round:stopping` → trava campos imediatamente.
* Recebe `round:end` → mostra placar da rodada e totais.
* Após 5 rodadas → `match:end` → mostra vencedor.

---

## 5. 🎲 Fluxo Geral do Jogo (End-to-End)

```
Jogador A                     Servidor Backend               Jogador B
──────────                    ────────────────               ───────────
Login        ───────────────▶  Autenticação  ◀────────────── Login
Cria sala    ───────────────▶  /rooms
                                 │
             ◀───────────────────┘ join-room via Socket
Clica iniciar ───────────────▶  /matches/start
                                 │
           round:ready/started ─▶ Recebe rodada/tema/letra
Preenche campos
STOP click   ───────────────▶  round:stop (Socket)
                                 │
                           round:stopping ─────────────▶  Inputs travam
                           endRoundAndScore()
                                 │
          ◀────── round:end  ◀────────────── round:end
Mostra placar e totais
```

➡️ Repete por 5 rodadas → `match:end` → mostra vencedor.
➡️ Sincronização total garantida via Socket.IO rooms.

---

## 6. 🔌 Fluxo da API (REST + WebSocket)

### 📡 Rotas REST Principais

| Método                | Endpoint              | Função                           | Observações |
| :-------------------- | :-------------------- | :------------------------------- | :---------- |
| `POST /auth/register` | Cria jogador          | Salva no Supabase                |             |
| `POST /auth/login`    | Autentica jogador     | Retorna token e `jogador_id`     |             |
| `POST /rooms`         | Cria sala             | Retorna `sala_id`                |             |
| `POST /rooms/join`    | Entra em sala         | Associa jogador                  |             |
| `POST /matches/start` | Inicia partida        | Cria 5 rodadas e dispara socket  |             |
| `POST /answers`       | Envia resposta        | Apenas se `status = in_progress` |             |
| `GET /shop/items`     | Lista itens da loja   | Futuro: power-ups                |             |
| `POST /shop/purchase` | Compra item           | Atualiza inventário              |             |
| `GET /wallet`         | Mostra saldo fictício |                                  |             |

---

### ⚡ Eventos WebSocket (tempo real)

| Evento              | Direção | Payload                           | Descrição               |
| :------------------ | :------ | :-------------------------------- | :---------------------- |
| `join-room`         | C → S   | `{ salaId }`                      | Entra em sala Socket.IO |
| `round:ready`       | S → C   | `{ rodada_id, letra, temas[] }`   | Prepara rodada          |
| `round:started`     | S → C   | `{ roundId, duration }`           | Começa contagem         |
| `round:tick`        | S → C   | `{ segundos_restantes }`          | Atualiza timer          |
| `round:stop`        | C → S   | `{ salaId, roundId, by }`         | Jogador clica STOP      |
| `round:stopping`    | S → C   | `{ roundId }`                     | Trava inputs            |
| `round:end`         | S → C   | `{ roundId, roundScore, totais }` | Mostra pontuação        |
| `match:end`         | S → C   | `{ totais, vencedor }`            | Fim da partida          |
| `powerup:use`       | C ↔ S   | `{ type, temaId? }`               | Usa power-up (Sprint 2) |
| `answer:autoFilled` | S → C   | `{ temaId, texto }`               | Palavra auto-preenchida |

---