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

@description('Enable Azure observability resources and wiring.')
param enableObservability bool = true

@description('Create a new Log Analytics workspace in this resource group.')
param createLogAnalyticsWorkspace bool = true

@description('Name for Log Analytics workspace (used when creating or referencing in this resource group).')
param logAnalyticsWorkspaceName string = '${appName}-law'

@description('Retention (days) for Log Analytics workspace.')
@minValue(30)
@maxValue(730)
param logAnalyticsRetentionInDays int = 30

@description('Create an Application Insights resource connected to Log Analytics.')
param createApplicationInsights bool = true

@description('Name of the Application Insights component.')
param applicationInsightsName string = '${appName}-appi'

var planName = '${appName}-plan'
var identityType = enableManagedIdentity ? 'SystemAssigned' : 'None'
var hasWorkspace = createLogAnalyticsWorkspace || (!createLogAnalyticsWorkspace && !empty(logAnalyticsWorkspaceName))
var enableAi = enableObservability && createApplicationInsights && hasWorkspace
var baseAppSettings = [
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
      appSettings: concat(
        baseAppSettings,
        enableAi
          ? [
              {
                name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
                value: appInsights!.properties.ConnectionString
              }
            ]
          : []
      )
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

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = if (enableObservability && createLogAnalyticsWorkspace) {
  name: logAnalyticsWorkspaceName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: logAnalyticsRetentionInDays
    features: {
      searchVersion: 1
      legacy: 0
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

resource existingLogAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = if (enableObservability && !createLogAnalyticsWorkspace && !empty(logAnalyticsWorkspaceName)) {
  name: logAnalyticsWorkspaceName
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = if (enableAi) {
  name: applicationInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: createLogAnalyticsWorkspace ? logAnalytics.id : existingLogAnalytics.id
    IngestionMode: 'LogAnalytics'
  }
}

resource siteDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = if (enableObservability && hasWorkspace) {
  name: '${appName}-diag'
  scope: site
  properties: {
    workspaceId: createLogAnalyticsWorkspace ? logAnalytics.id : existingLogAnalytics.id
    logs: [
      {
        category: 'AppServiceAppLogs'
        enabled: true
      }
      {
        category: 'AppServiceConsoleLogs'
        enabled: true
      }
      {
        category: 'AppServiceHTTPLogs'
        enabled: true
      }
      {
        category: 'AppServicePlatformLogs'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

output webAppName string = site.name
output webAppDefaultHostName string = site.properties.defaultHostName
output webAppUrl string = 'https://${site.properties.defaultHostName}'
output logAnalyticsWorkspaceId string = enableObservability && hasWorkspace ? (createLogAnalyticsWorkspace ? logAnalytics.id : existingLogAnalytics.id) : ''
output applicationInsightsName string = enableAi ? appInsights.name : ''
