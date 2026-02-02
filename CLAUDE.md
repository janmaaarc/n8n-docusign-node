# n8n-docusign-node

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
└── resources/                # UI field definitions by resource
    ├── envelope.ts
    ├── template.ts
    └── index.ts

credentials/
└── DocuSignApi.credentials.ts  # JWT authentication with token caching

test/
└── DocuSign.test.ts            # Vitest test files
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
- Run `npm run lint && npm run build && npm test` before committing
- Update CHANGELOG.md for user-facing changes
- Update SECURITY.md for security-related changes

## API Reference

- [DocuSign eSignature API Docs](https://developers.docusign.com/docs/esign-rest-api/)
- [JWT Authentication Guide](https://developers.docusign.com/platform/auth/jwt/)
- [DocuSign Connect Webhooks](https://developers.docusign.com/platform/webhooks/connect/)
- [n8n Node Development](https://docs.n8n.io/integrations/creating-nodes/)
