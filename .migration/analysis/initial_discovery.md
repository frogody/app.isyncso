# ISYNCSO Migration - Initial Discovery

## Date: 2026-01-04

## Base44 Entities Found (15 entities)

| Entity | Export Location |
|--------|-----------------|
| `Candidate` | src/api/entities.js |
| `ChatConversation` | src/api/entities.js |
| `Organization` | src/api/entities.js |
| `UserInvitation` | src/api/entities.js |
| `Team` | src/api/entities.js |
| `ChatProgress` | src/api/entities.js |
| `Project` | src/api/entities.js |
| `OutreachMessage` | src/api/entities.js |
| `Task` | src/api/entities.js |
| `IntelligenceProgress` | src/api/entities.js |
| `RegenerationJob` | src/api/entities.js |
| `OutreachTask` | src/api/entities.js |
| `Campaign` | src/api/entities.js |
| `Role` | src/api/entities.js |
| `Client` | src/api/entities.js |

## Base44 Integrations Found (7 integrations)

| Integration | Purpose |
|-------------|---------|
| `InvokeLLM` | AI/LLM calls |
| `SendEmail` | Email sending |
| `UploadFile` | File uploads |
| `GenerateImage` | Image generation |
| `ExtractDataFromUploadedFile` | File data extraction |
| `CreateFileSignedUrl` | Signed URL generation |
| `UploadPrivateFile` | Private file uploads |

## Cloud Functions Found (60+ functions)

### Authentication & User Management
- `inviteUser`
- `acceptInvitation`
- `assignUserToOrganization`
- `syncDomainUsers`
- `getUsersByIds`

### Google Integration
- `googleSheetsAuth`
- `syncGoogleSheet`
- `googleSheetsCallback`
- `exchangeGoogleCode`
- `googleOAuthUnified`
- `googleOAuthCallback`

### Candidate Intelligence
- `generateCandidateIntelligence`
- `bulkGenerateIntelligence`
- `regenerateAllIntelligence`

### Outreach & Messaging
- `generateOutreachMessage`
- `createFollowUpTask`
- `handleFollowUpResponse`
- `generateFollowUpMessage`
- `createTaskAfterFollowUp`
- `clearOutreachAndTasks`
- `createOutreachTask`

### Campaign Management
- `analyzeCampaignProject`
- `dailyCampaignMatching`
- `generateCampaignOutreach`

### Candidate Management
- `chatWithCandidates`
- `assignCandidateRoundRobin`
- `migrateCandidatesToOrganization`
- `assignOrganizationToCandidates`
- `assignOwnersEvenly`

### Profile Picture Extraction
- `fetchLinkedInProfilePicture`
- `updateCandidateProfilePictures`
- `autoFetchProfilePicture`
- `extractLinkedInProfilePicture`
- `bulkExtractProfilePictures`
- `autoLoadAllProfilePictures`

### Web Scraping
- `brightDataLinkedIn`
- `testBrightDataConnection`
- `scrapeWebsiteVacancies`
- `deepScrapeVacancies`

### MCP Tools
- `mcpToolsConfig`
- `mcpTools/googleDrive`
- `mcpTools/googleMaps`
- `mcpTools/braveSearch`
- `mcpTools/gmail`
- `mcpToolsHandler`
- `mcpServer`
- `generateMCPToken`
- `testMcpServer`

### Sync Functions (iOS Integration)
- `syncGetAllCandidates`
- `syncGetCandidateComplete`
- `syncGetAllCampaigns`
- `syncGetCampaignComplete`
- `syncGetDashboardAnalytics`
- `syncExportData`
- `getOutreachTasks`

### Utility Functions
- `generateApiKey`
- `zapierWebhook`
- `generateFile`
- `parseLocationDescription`
- `claudeClient`
- `utils/events`

## Supabase Credentials (Discovered)

- **Project Ref**: `hktkopulegnmdszxkwld`
- **URL**: `https://hktkopulegnmdszxkwld.supabase.co`
- **Location**: Found in `/Users/daviddebruin/SkillSync/SkillSyncMac/SkillSync/.env`

## MCP Servers Configured

1. **Supabase MCP** - Configured, awaiting OAuth
2. **Desktop Commander** - Configured, awaiting restart
3. **XcodeBuildMCP** - Already active
4. **Framer SSE** - Already active

## Next Steps

1. Wait for background agents to complete full analysis
2. Restart Claude Code to activate Supabase MCP
3. Connect to Supabase to analyze existing schema
4. Map entities to Supabase tables
5. Create migration plan
