# Runbook

## Discord app setup
1. Create a Discord Application + Bot in the Discord Developer Portal.
2. Copy the bot token into `DISCORD_TOKEN`.
3. Copy the Application (Client) ID into `DISCORD_CLIENT_ID`.
4. Invite the bot to your dev server using OAuth2 URL generator:
   - Scopes: `bot`, `applications.commands`
   - Permissions: minimal at first

## Local dev
- Create `.env` from `.env.example`.
- Run `pnpm dev`.
- Verify commands in your dev guild:
  - `/ping`, `/help`, `/version`

## Message triggers
Respond-mode triggers are **mention-only**. Example:
- `@YourBot echo hello`

## Inventory tooling
Clone hubot-scripts into `./vendor/hubot-scripts` (or set `HUBOT_SCRIPTS_DIR`) then run:
- `pnpm inventory`

Outputs:
- `manifest/scripts.json`
- `manifest/commands.csv`
- `docs/MIGRATION.md`
- `manifest/progress.json`

## Azure hosting
See `docs/AZURE_DEPLOYMENT_CHECKLIST.md`.

### Bicep deployment
This repo includes:
- `infra/main.bicep`
- `infra/main.parameters.example.json`

Usage:
1. Copy `infra/main.parameters.example.json` to `infra/main.parameters.json`.
2. Fill required values (especially `appName`, `linuxFxVersion`, `discordToken`, `discordClientId`, `databaseUrl`).
3. Deploy:
   - `az deployment group create --resource-group <resource-group> --template-file infra/main.bicep --parameters @infra/main.parameters.json`
4. Observability defaults:
   - `enableObservability=true`
   - creates Log Analytics + Application Insights
   - wires App Service diagnostic settings + `APPLICATIONINSIGHTS_CONNECTION_STRING`

## Azure App Service validation
Before production traffic, verify all of the following:
1. App Service Plan SKU is Basic (or higher).
2. Web App settings:
   - `Always On = On`
   - `WebSockets = On`
   - Instance count is `1` until Postgres-backed scale validation is complete.
3. App settings include:
   - `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DATABASE_URL`
   - `NODE_ENV=production`
4. If health checks are enabled:
   - `HTTP_ENABLED=true`
   - Health check path points to `/healthz`
