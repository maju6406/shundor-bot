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
