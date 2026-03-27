# n8n-nodes-docusign-esign

## Project Overview

n8n community node for DocuSign eSignature API integration. Provides both regular node operations and webhook trigger functionality for n8n workflows.

**Tech Stack:** TypeScript, n8n node SDK, Vitest for testing

## File Structure

```
nodes/DocuSign/
├── DocuSign.node.ts          # Main node (API operations)
├── DocuSignTrigger.node.ts   # Webhook trigger node
├── helpers.ts                # API helpers, validation, retry logic
├── constants.ts              # API URLs, status codes, defaults
├── types.ts                  # TypeScript interfaces
└── resources/                # UI field definitions by resource (53 resources)
    ├── accountCustomField.ts
    ├── accountGroup.ts
    ├── accountSettings.ts
    ├── accountSignature.ts
    ├── accountUser.ts
    ├── accountWatermark.ts
    ├── billing.ts
    ├── brand.ts
    ├── bulkSend.ts
    ├── captiveRecipient.ts
    ├── chunkedUpload.ts
    ├── cloudStorage.ts
    ├── comments.ts
    ├── compositeTemplate.ts
    ├── connectConfig.ts
    ├── connectEvent.ts
    ├── consumerDisclosure.ts
    ├── contact.ts
    ├── customTab.ts
    ├── diagnostics.ts
    ├── documentGeneration.ts
    ├── emailArchive.ts
    ├── envelope.ts
    ├── envelopeAttachment.ts
    ├── envelopeCustomField.ts
    ├── envelopeDocumentField.ts
    ├── envelopeEmailSetting.ts
    ├── envelopeLock.ts
    ├── envelopeNotification.ts
    ├── envelopePurge.ts
    ├── envelopeTransfer.ts
    ├── folder.ts
    ├── idVerification.ts
    ├── notary.ts
    ├── notaryJournal.ts
    ├── paymentTab.ts
    ├── permissionProfile.ts
    ├── powerForm.ts
    ├── recipientTabs.ts
    ├── reporting.ts
    ├── scheduledRouting.ts
    ├── signingGroup.ts
    ├── supplementalDoc.ts
    ├── template.ts
    ├── templateBulkRecipient.ts
    ├── templateCustomField.ts
    ├── templateDocument.ts
    ├── templateLock.ts
    ├── templateNotification.ts
    ├── templateRecipients.ts
    ├── templateView.ts
    ├── trustServiceProvider.ts
    ├── workspace.ts
    └── index.ts

credentials/
├── DocuSignApi.credentials.ts      # JWT authentication with token caching
└── DocuSignOAuth2Api.credentials.ts # OAuth2 Authorization Code Grant

test/
├── DocuSign.test.ts            # Core test file (320 tests)
├── setup/
│   ├── mockContext.ts           # Shared mock context factory
│   └── constants.ts             # Shared test constants
└── features/                    # Feature-specific tests (234 tests)
    ├── accountCustomField.test.ts
    ├── accountGroup.test.ts
    ├── accountSettings.test.ts
    ├── accountSignature.test.ts
    ├── accountUser.test.ts
    ├── accountWatermark.test.ts
    ├── billing.test.ts
    ├── captiveRecipient.test.ts
    ├── chunkedUpload.test.ts
    ├── cloudStorage.test.ts
    ├── comments.test.ts
    ├── compositeTemplate.test.ts
    ├── connectConfig.test.ts
    ├── connectEvent.test.ts
    ├── consumerDisclosure.test.ts
    ├── contact.test.ts
    ├── customTab.test.ts
    ├── diagnostics.test.ts
    ├── emailArchive.test.ts
    ├── envelopeAttachment.test.ts
    ├── envelopeCustomField.test.ts
    ├── envelopeDocumentField.test.ts
    ├── envelopeEmailSetting.test.ts
    ├── envelopeNotification.test.ts
    ├── envelopePurge.test.ts
    ├── envelopeTransfer.test.ts
    ├── envelopeViews.test.ts
    ├── idVerification.test.ts
    ├── notary.test.ts
    ├── notaryJournal.test.ts
    ├── oauth2Credential.test.ts
    ├── paymentTab.test.ts
    ├── permissionProfile.test.ts
    ├── powerFormData.test.ts
    ├── recipientTabs.test.ts
    ├── reporting.test.ts
    ├── scheduledRouting.test.ts
    ├── supplementalDoc.test.ts
    ├── templateBulkRecipient.test.ts
    ├── templateCustomField.test.ts
    ├── templateDocument.test.ts
    ├── templateLock.test.ts
    ├── templateNotification.test.ts
    ├── templateRecipients.test.ts
    ├── templateView.test.ts
    ├── trustServiceProvider.test.ts
    ├── webhookEnhancement.test.ts
    └── workspace.test.ts
```

## Critical Rules

### 1. n8n Node Patterns

- Use `INodeType` interface for nodes
- Use `INodeTypeDescription` for metadata
- Operations return `INodeExecutionData[][]`
- Always handle `continueOnFail` option
- Use `this.helpers.httpRequestWithAuthentication` for API calls

### 2. Code Style

- Immutability always - never mutate objects
- No console.log statements
- Proper error handling with NodeApiError
- Input validation before API calls
- JSDoc comments on public functions

### 3. Testing

- Vitest with 70%+ coverage target
- Mock n8n execution context
- Test both success and error paths
- Test input validation edge cases

### 4. Security

- Validate emails (RFC 5322)
- Validate URLs (block SSRF - private IPs, localhost)
- Validate UUIDs for envelope/template IDs
- Webhook signature verification (HMAC-SHA256)
- No hardcoded credentials

## Key Patterns

### API Request Helper

```typescript
const response = await docuSignApiRequest.call(
  this,
  'GET',
  '/envelopes',
  {},
  { status: 'completed' }
);
```

### Input Validation

```typescript
import { validateField } from './helpers';

const email = this.getNodeParameter('email', i) as string;
validateField('Email', email, 'email'); // Throws Error if invalid
```

### Pagination

```typescript
const returnAll = this.getNodeParameter('returnAll', i) as boolean;
if (returnAll) {
  responseData = await docuSignApiRequestAllItems.call(
    this, 'GET', '/envelopes', 'envelopes', qs
  );
} else {
  const limit = this.getNodeParameter('limit', i) as number;
  qs.count = limit;
  responseData = await docuSignApiRequest.call(this, 'GET', '/envelopes', undefined, qs);
}
```

### Building Envelope Components

```typescript
import { buildSigner, buildDocument, buildSignHereTab } from './helpers';

const signer = buildSigner(email, name, '1', '1');
const document = buildDocument(base64Content, '1', 'contract.pdf', 'pdf');
const signHereTab = buildSignHereTab('1', '1', { xPosition: '100', yPosition: '100' });
```

### Embedded Signing URL

```typescript
// Create recipient view for embedded signing
const body = {
  email: signerEmail,
  userName: signerName,
  returnUrl: 'https://yourapp.com/complete',
  authenticationMethod: 'None',
  clientUserId: 'unique-user-id',
};
const response = await docuSignApiRequest.call(
  ctx, 'POST', `/envelopes/${envelopeId}/views/recipient`, body
);
// Returns { url: 'https://docusign.com/signing-url...' }
```

### Custom Fields

```typescript
// Add custom metadata fields to envelope
envelope.customFields = {
  textCustomFields: [
    { fieldId: '1', name: 'OrderNumber', value: 'ORD-123', show: 'true' },
  ],
};
```

### Merge Fields (Dynamic Document Population)

```typescript
// Merge fields automatically convert to text tabs with anchor strings
// Put placeholders like {{FirstName}} in your document, then map them:
const mergeFields = {
  fields: [
    { placeholder: '{{FirstName}}', value: 'John', fontSize: 'Size12' },
    { placeholder: '{{Company}}', value: 'Acme Inc', fontSize: 'Size12' },
    { placeholder: '{{Date}}', value: '2025-02-05', fontSize: 'Size10' },
  ],
};
// These are automatically converted to textTabs with anchorString
```

## Available Commands

```bash
npm run build      # Compile TypeScript
npm run lint       # ESLint check
npm run format     # Prettier format
npm test           # Run Vitest tests
npm run test:coverage   # Tests with coverage
npm run typecheck  # TypeScript type check
```

## Git Workflow

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- **ALWAYS run `npm run lint && npm run build && npm test` before committing and pushing** to catch CI/CD errors locally
- Update CHANGELOG.md for user-facing changes
- Update SECURITY.md for security-related changes

## API Reference

- [DocuSign eSignature API Docs](https://developers.docusign.com/docs/esign-rest-api/)
- [JWT Authentication Guide](https://developers.docusign.com/platform/auth/jwt/)
- [DocuSign Connect Webhooks](https://developers.docusign.com/platform/webhooks/connect/)
- [n8n Node Development](https://docs.n8n.io/integrations/creating-nodes/)
