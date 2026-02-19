# Discord Sapphire Hubot Migration

This repo is a scaffold for migrating scripts from `github/hubot-scripts` into a modern Discord bot using **Sapphire**.

## Quickstart (local)
1. Copy `.env.example` to `.env` and fill in Discord values.
2. Install deps:
   - `pnpm i` (recommended) or `npm i`
3. Run:
   - `pnpm dev`

## Inventory
Point `HUBOT_SCRIPTS_DIR` at a local clone of `github/hubot-scripts` and run:
- `pnpm inventory`

## Azure (Bicep)
Infrastructure template:
- `infra/main.bicep`
- `infra/main.parameters.example.json`

Deploy:
1. Copy `infra/main.parameters.example.json` to `infra/main.parameters.json` and fill values.
2. Run:
   - `az deployment group create --resource-group <rg-name> --template-file infra/main.bicep --parameters @infra/main.parameters.json`

See `docs/RUNBOOK.md` for Discord setup + Azure hosting notes.
