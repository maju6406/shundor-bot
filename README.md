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

See `docs/RUNBOOK.md` for Discord setup + Azure hosting notes.
