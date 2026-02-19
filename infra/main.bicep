targetScope = 'resourceGroup'

@description('Globally unique Web App name.')
param appName string

@description('Azure region for App Service resources.')
param location string = resourceGroup().location

@description('Linux App Service plan SKU (Basic or higher recommended).')
@allowed([
  'B1'
  'B2'
  'B3'
  'S1'
  'S2'
  'S3'
  'P1v3'
  'P2v3'
  'P3v3'
])
param appServiceSkuName string = 'B1'

@description('Container image in LinuxFxVersion format, e.g. DOCKER|ghcr.io/org/repo:tag')
param linuxFxVersion string

@description('Optional startup command. Leave empty to use Dockerfile CMD.')
param appCommandLine string = ''

@description('Enable system-assigned managed identity for the Web App.')
param enableManagedIdentity bool = true

@description('Set true when pulling from ACR with managed identity.')
param acrUseManagedIdentityCreds bool = false

@description('Optional ACR name for AcrPull role assignment.')
param acrName string = ''

@secure()
@description('Discord bot token.')
param discordToken string

@description('Discord application client ID.')
param discordClientId string

@description('Optional guild ID for scoped command registration.')
param discordGuildId string = ''

@description('Bot name.')
param botName string = 'HubotMigrator'

@description('Pino log level.')
param logLevel string = 'info'

@description('Comma-separated admin role IDs.')
param adminRoleIds string = ''

@secure()
@description('Postgres connection string (required for production).')
param databaseUrl string

@description('Node environment.')
@allowed([
  'production'
  'development'
  'test'
])
param nodeEnv string = 'production'

@description('Optional git SHA for /version command.')
param gitSha string = ''

@description('Enable HTTP health server.')
param httpEnabled bool = true

@description('App HTTP port.')
param httpPort int = 3000

var planName = '${appName}-plan'
var identityType = enableManagedIdentity ? 'SystemAssigned' : 'None'

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  sku: {
    name: appServiceSkuName
    tier: startsWith(appServiceSkuName, 'P') ? 'PremiumV3' : startsWith(appServiceSkuName, 'S') ? 'Standard' : 'Basic'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource site 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  kind: 'app,linux,container'
  identity: {
    type: identityType
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: linuxFxVersion
      appCommandLine: appCommandLine
      alwaysOn: true
      webSocketsEnabled: true
      acrUseManagedIdentityCreds: acrUseManagedIdentityCreds
      appSettings: [
        {
          name: 'DISCORD_TOKEN'
          value: discordToken
        }
        {
          name: 'DISCORD_CLIENT_ID'
          value: discordClientId
        }
        {
          name: 'DISCORD_GUILD_ID'
          value: discordGuildId
        }
        {
          name: 'BOT_NAME'
          value: botName
        }
        {
          name: 'LOG_LEVEL'
          value: logLevel
        }
        {
          name: 'ADMIN_ROLE_IDS'
          value: adminRoleIds
        }
        {
          name: 'DATABASE_URL'
          value: databaseUrl
        }
        {
          name: 'NODE_ENV'
          value: nodeEnv
        }
        {
          name: 'GIT_SHA'
          value: gitSha
        }
        {
          name: 'HTTP_ENABLED'
          value: string(httpEnabled)
        }
        {
          name: 'HTTP_PORT'
          value: string(httpPort)
        }
        {
          name: 'WEBSITES_PORT'
          value: string(httpPort)
        }
      ]
    }
  }
}

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = if (!empty(acrName)) {
  name: acrName
}

resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (enableManagedIdentity && acrUseManagedIdentityCreds && !empty(acrName)) {
  name: guid(acr.id, site.id, 'AcrPull')
  scope: acr
  properties: {
    principalId: site.identity.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalType: 'ServicePrincipal'
  }
}

resource siteConfig 'Microsoft.Web/sites/config@2023-12-01' = {
  parent: site
  name: 'web'
  properties: {
    healthCheckPath: httpEnabled ? '/healthz' : ''
  }
}

output webAppName string = site.name
output webAppDefaultHostName string = site.properties.defaultHostName
output webAppUrl string = 'https://${site.properties.defaultHostName}'
