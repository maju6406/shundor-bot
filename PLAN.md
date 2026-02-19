# PLAN.md --- Hubot Scripts → Discord (Sapphire) Migration + Azure Hosting

This repository will become a **Discord-first bot** using **TypeScript +
Sapphire** that migrates Hubot scripts from:

-   https://github.com/github/hubot-scripts/tree/master/src/scripts

The bot will support **message-based triggers** (Hubot parity) and
**slash commands**, and will be production-hosted on **Azure App Service
(Linux, container)** with **PostgreSQL** for durable storage.

------------------------------------------------------------------------

# 🚀 High-Level Goals

Build a production-ready Discord bot that:

-   ✅ Uses **@sapphire/framework + discord.js**
-   ✅ Preserves Hubot `hear` and `respond` behavior via a centralized
    message-trigger router\
-   ✅ Provides modern slash commands for intentional workflows\
-   ✅ Includes automated inventory + migration tracking\
-   ✅ Uses **PostgreSQL in production** (SQLite for local dev only)\
-   ✅ Deploys via **Docker → Azure App Service (Linux)**\
-   ✅ Is observable, secure, and maintainable

------------------------------------------------------------------------

# 🧭 Architecture Decisions (Non-Negotiable)

## Core stack

-   Language: **TypeScript**
-   Discord: **discord.js**
-   Framework: **@sapphire/framework**
-   Logging: **pino**
-   Config validation: **dotenv + zod**
-   HTTP client: **undici**
-   Cooldowns: in-memory (per instance)

## Storage strategy

### Local development

-   SQLite via `better-sqlite3`

### Production (Azure)

-   **PostgreSQL (Azure Database for PostgreSQL)**
-   Use `DATABASE_URL` connection string
-   Single storage abstraction that supports both

**Rule:** never couple business logic directly to SQLite.

------------------------------------------------------------------------

## Message trigger behavior (Hubot parity)

### Respond-mode (`robot.respond`)

-   **MENTION-ONLY**
-   Example:
    -   `@MyBot deploy prod` ✅
    -   `!deploy prod` ❌ (prefix not required)
-   Implement robust mention detection.

### Hear-mode (`robot.hear`)

-   Ambient pattern matching
-   Must:
    -   ignore bot messages
    -   enforce cooldowns
    -   support future channel/guild gating

### Routing rules

-   Single `messageCreate` listener
-   Central router executes triggers
-   Default: **first match wins**
-   Allow explicit multi-fire only when configured
-   All output sanitized (no accidental mass mentions)

------------------------------------------------------------------------

# 🗂️ Target Repository Layout

    src/
      index.ts
      lib/
        env.ts
        logger.ts
        util/
          cooldown.ts
          text.ts
        storage/
          db.ts
          kv.ts
        hubot/
          headerParser.ts
          scriptScanner.ts
          classifier.ts
      commands/
        ping.ts
        help.ts
        version.ts
        admin/
          triggers.ts
      listeners/
        ready.ts
        messageCreate.ts
        interactionError.ts
      message-triggers/
        types.ts
        router.ts
        index.ts
        builtins/
          _example_hear.ts
          _example_respond.ts
      http/
        server.ts
        routes/
          healthz.ts
    manifest/
      scripts.json
      commands.csv
      progress.json
    tools/
      inventory/
        scanHubotScripts.ts
        generateBacklog.ts
    docs/
      RUNBOOK.md
      MIGRATION.md
      COMMANDS.md
      REPORT.md
    docker/
      Dockerfile
    .env.example
    package.json
    tsconfig.json
    README.md
    PLAN.md

------------------------------------------------------------------------

# 🔐 Environment Variables

Create `.env.example`:

    # Discord
    DISCORD_TOKEN=
    DISCORD_CLIENT_ID=
    DISCORD_GUILD_ID=

    # Bot
    BOT_NAME=HubotMigrator
    LOG_LEVEL=info
    BOT_PREFIX=
    ADMIN_ROLE_IDS=

    # Database
    DATABASE_URL=            # REQUIRED in production
    DATABASE_PATH=./data/bot.sqlite  # used in local dev fallback
    NODE_ENV=development

    # Hubot source
    HUBOT_SCRIPTS_DIR=./vendor/hubot-scripts/src/scripts

    # HTTP server
    HTTP_ENABLED=false
    HTTP_PORT=3000

    # Optional
    GIT_SHA=

------------------------------------------------------------------------

# ☁️ Azure Hosting Strategy (Production)

## Primary target: Azure App Service (Linux, container)

**Why**

-   Long-running process friendly\
-   Supports WebSockets (Discord gateway)\
-   Always On keeps bot warm\
-   Simple CI/CD story\
-   No VM patching overhead

------------------------------------------------------------------------

## Required Azure App Service settings

After deployment, configure:

-   ✅ **Always On = ON**
-   ✅ **WebSockets = ON**
-   ✅ Minimum instances = 1
-   ✅ Container-based deployment
-   ✅ App Service Plan: Basic or higher (Always On requires this)

------------------------------------------------------------------------

## Database (Production)

Provision:

-   **Azure Database for PostgreSQL (Flexible Server)**

Set:

    DATABASE_URL=postgresql://user:pass@host:5432/dbname

------------------------------------------------------------------------

## Scaling rules

-   Start with **1 instance**
-   SQLite must NOT be used in multi-instance production
-   PostgreSQL required before horizontal scale

------------------------------------------------------------------------

## When to use Azure VM instead (not default)

Only choose VM if:

-   You intentionally want single-box SQLite
-   You require deep OS customization
-   You accept patching/ops overhead

Otherwise: **App Service wins**.

------------------------------------------------------------------------

# 🐳 Docker Requirements

Dockerfile must:

-   Use multi-stage build
-   Compile TypeScript → `dist`
-   Run `node dist/index.js`
-   Create `/home/data` or similar writable path
-   Respect `PORT` if HTTP enabled

------------------------------------------------------------------------

# ✅ Definition of Done (Initial Implementation)

The repo is considered bootstrapped when:

-   Bot runs locally with `pnpm dev`
-   Slash commands work:
    -   `/ping`
    -   `/help`
    -   `/version`
-   Message router works:
    -   example hear trigger
    -   example respond trigger (mention-only)
-   Inventory tool generates:
    -   `manifest/scripts.json`
    -   `manifest/commands.csv`
    -   `docs/MIGRATION.md`
    -   `manifest/progress.json`
-   Docker image builds successfully
-   RUNBOOK documents Azure deployment

------------------------------------------------------------------------

# 🏁 Future Phases (Not in initial Codex scope)

-   Bulk script conversion
-   Scheduled task plugin
-   Advanced observability
-   Multi-instance scaling
-   AI assistant layer

------------------------------------------------------------------------

**End of PLAN.md**
