# Azure Deployment Checklist (App Service — Linux Container)

This checklist targets **Azure App Service (Linux) — Web App for Containers** for a long-running Discord bot.

## 1) Prereqs
- [ ] Discord bot token created and stored securely
- [ ] Azure subscription + permissions to create:
  - [ ] Resource Group
  - [ ] App Service Plan (Linux)
  - [ ] Web App (Container)
  - [ ] Azure Database for PostgreSQL (Flexible Server) (recommended for production)

## 2) Build + push container image
Choose one:

### Option A: GitHub Actions to Azure (recommended)
- [ ] Create an Azure Container Registry (ACR) OR use GitHub Container Registry (GHCR)
- [ ] Set up GitHub Actions workflow to build/push image on main branch
- [ ] Ensure image tag includes git sha (e.g., `:sha-<GIT_SHA>`)

### Option B: Local build + ACR push
- [ ] `docker build -t <acr>.azurecr.io/<app>:<tag> -f docker/Dockerfile .`
- [ ] `docker push <acr>.azurecr.io/<app>:<tag>`

## 3) Provision PostgreSQL (Flexible Server)
- [ ] Create PostgreSQL Flexible Server
- [ ] Create database and user
- [ ] Configure networking:
  - [ ] Allow outbound access from App Service (Private networking optional)
  - [ ] If public access: add firewall rules (least privilege)
- [ ] Store connection string in App Service setting `DATABASE_URL`

> Production guidance: avoid SQLite for durable state, and avoid multi-instance scaling until DB is Postgres-backed.

## 4) Create App Service Plan (Linux)
- [ ] Create **Linux** App Service Plan
- [ ] Select SKU that supports **Always On** (Basic or higher)

## 5) Create Web App (Container)
- [ ] Create Web App for Containers
- [ ] Configure container image source (ACR or GHCR)
- [ ] Set startup command (if needed): default from Dockerfile is fine

## 6) App settings (Configuration)
Add these Application settings:
- [ ] `DISCORD_TOKEN`
- [ ] `DISCORD_CLIENT_ID`
- [ ] `BOT_NAME`
- [ ] `LOG_LEVEL=info`
- [ ] `ADMIN_ROLE_IDS` (comma-separated role IDs)
- [ ] `DATABASE_URL` (Postgres connection string)
- [ ] `NODE_ENV=production`
- [ ] `GIT_SHA` (optional)

Optional:
- [ ] `HTTP_ENABLED=true` if you want `/healthz`
- [ ] `HTTP_PORT=3000` (App Service injects `PORT` automatically; your app should bind `PORT` when set)

## 7) Platform settings
- [ ] **Always On = ON**
- [ ] **WebSockets = ON**
- [ ] Health check path (optional): `/healthz` (enable HTTP server and route)

## 8) Logging + diagnostics
- [ ] Enable Application Logging (filesystem or blob)
- [ ] Enable Container logging
- [ ] Verify logs show “ready” event after deployment

## 9) Validate in production
- [ ] Verify bot is online in Discord
- [ ] Run `/ping`, `/help`, `/version`
- [ ] Verify mention-only respond trigger:
  - [ ] `@Bot echo hello`
- [ ] Confirm admin gating works:
  - [ ] `/triggers list` works only for admin roles

## 10) Scaling and reliability
- [ ] Keep **instance count = 1** until you confirm DB + concurrency readiness
- [ ] If scaling out:
  - [ ] Ensure DB is Postgres (required)
  - [ ] Confirm cooldown/trigger semantics are acceptable across instances (in-memory cooldowns won’t coordinate)
  - [ ] Consider moving cooldowns to Redis if needed

## 11) Security hygiene
- [ ] Rotate Discord token if exposed
- [ ] Restrict Admin role IDs carefully
- [ ] Use least-privilege for DB user
- [ ] Avoid echoing secrets in logs (redact if needed)
