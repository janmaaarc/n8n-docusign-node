# n8n-docusign-node

[![npm version](https://img.shields.io/npm/v/n8n-docusign-node.svg)](https://www.npmjs.com/package/n8n-docusign-node)
[![n8n-community](https://img.shields.io/badge/n8n-community%20node-orange)](https://docs.n8n.io/integrations/community-nodes/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/janmaaarc/n8n-docusign-node/actions/workflows/ci.yml/badge.svg)](https://github.com/janmaaarc/n8n-docusign-node/actions/workflows/ci.yml)

An [n8n](https://n8n.io/) community node for [DocuSign](https://www.docusign.com/) - the world's leading eSignature platform for sending documents for signature and managing envelopes.

## Features

- **Full Envelope Management** - Create, send, void, delete, and download documents
- **Embedded Signing** - Generate signing URLs for iframe integration in your app
- **Multiple Signers & Documents** - Support for multiple signers with routing order and multiple documents per envelope
- **Advanced Tab Types** - Signature, initials, date, text fields, checkboxes, and more
- **Custom Fields** - Add metadata fields to envelopes for tracking and reporting
- **Template Support** - Create envelopes from pre-configured templates
- **Webhook Trigger** - Real-time event notifications via DocuSign Connect
- **Regional Support** - NA, EU, AU, and CA regions for production environments
- **Rate Limiting** - Built-in retry logic with exponential backoff
- **Input Validation** - RFC 5322 compliant email validation, secure URL validation (blocks internal networks)
- **Token Caching** - Efficient JWT token caching with automatic refresh
- **Type Safety** - Full TypeScript support with comprehensive type definitions
- **Security Hardened** - HMAC-SHA256 webhook signature verification, replay attack protection

## Requirements

### DocuSign Plan Requirements

| Environment | Plan Required |
|-------------|---------------|
| Development/Testing | Free Developer Account |
| Production | Business Pro or higher |
| Webhooks (DocuSign Connect) | Business Pro+ or Connect add-on |

Start with a free [DocuSign Developer Account](https://developers.docusign.com/) to test before committing to a paid plan.

## Installation

### Community Nodes (Recommended)

1. Go to **Settings** > **Community Nodes** in your n8n instance
2. Select **Install**
3. Enter `n8n-docusign-node`
4. Click **Install**

### npm

```bash
npm install n8n-docusign-node
```

## Credentials

To use this node, you need DocuSign API credentials:

1. Log in to your [DocuSign Admin](https://admin.docusign.com/)
2. Go to **Settings** > **Apps and Keys**
3. Create an **Integration Key** (Client ID)
4. Generate an **RSA Key Pair** and save the private key
5. Note your **User ID** and **Account ID**

### Granting Consent

Before first use, grant consent for your integration:

**Demo:**
```
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=YOUR_INTEGRATION_KEY&redirect_uri=YOUR_REDIRECT_URI
```

**Production:**
```
https://account.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=YOUR_INTEGRATION_KEY&redirect_uri=YOUR_REDIRECT_URI
```

## Nodes

### DocuSign

The main node for interacting with the DocuSign eSignature API.

#### Resources & Operations

| Resource | Operations |
|----------|------------|
| **Envelope** | Create, Create From Template, Get, Get Many, Send, Resend, Void, Delete, Download Document, List Documents, Get Recipients, Update Recipients, Get Audit Events, Create Signing URL |
| **Template** | Get, Get Many |

#### Envelope Create Options

| Option | Description |
|--------|-------------|
| **Multiple Signers** | Add additional signers with routing order |
| **Multiple Documents** | Attach multiple documents to one envelope |
| **Embedded Signing** | Enable for iframe integration (adds clientUserId) |
| **Custom Fields** | Add metadata fields for tracking |
| **Additional Tabs** | Initial, date, text, checkbox, company, title fields |
| **Anchor Tags** | Position signature fields using text anchors |

### DocuSign Trigger

Webhook trigger node for receiving real-time events via DocuSign Connect.

#### Supported Events

- `envelope-sent` - Envelope sent to recipients
- `envelope-delivered` - Envelope delivered to recipient
- `envelope-completed` - All recipients completed signing
- `envelope-declined` - Recipient declined to sign
- `envelope-voided` - Envelope voided
- `recipient-sent` - Recipient received envelope
- `recipient-delivered` - Recipient viewed envelope
- `recipient-completed` - Recipient completed signing
- `recipient-declined` - Recipient declined
- `recipient-authenticationfailed` - Recipient failed authentication
- `template-created` - Template created
- `template-modified` - Template modified
- `template-deleted` - Template deleted

## Example Workflows

### 1. Send Contract for Signature

```
HTTP Request (Get Contract) > DocuSign (Create Envelope) > Slack (Notify Team)
```

Send a document for signature and notify your team.

### 2. Signed Document to Cloud Storage

```
DocuSign Trigger (envelope-completed) > DocuSign (Download Document) > Google Drive (Upload)
```

Automatically save signed documents to cloud storage.

### 3. Multi-Party Agreement

```
Form Trigger > DocuSign (Create Envelope with Multiple Signers) > Wait for Completion
```

Create envelopes with multiple signers using routing order.

### 4. Template-Based Onboarding

```
New Employee (Webhook) > DocuSign (Create From Template) > HR System (Update)
```

Use templates for standardized documents like onboarding forms.

### 5. Embedded Signing in Your App

```
Form Trigger > DocuSign (Create Envelope, Embedded=true) > DocuSign (Create Signing URL) > Redirect User
```

Generate signing URLs for embedding DocuSign in your application.

### 6. Envelope Status Dashboard

```
Schedule Trigger > DocuSign (Get Many, status=sent) > Google Sheets (Update)
```

Track pending envelopes and update a dashboard.

## Filtering

"Get Many" operations support filtering:

| Filter | Description | Available On |
|--------|-------------|--------------|
| `status` | Filter by envelope status | Envelopes |
| `fromDate` | Start date for date range | Envelopes |
| `toDate` | End date for date range | Envelopes |
| `searchText` | Search by subject or recipient | Envelopes, Templates |
| `folderId` | Filter by folder | Templates |

## Security

### Webhook Security

The webhook trigger includes built-in security features:

- **HMAC-SHA256 Signature Verification** - All webhooks verified using signatures
- **Replay Attack Protection** - Rejects webhook requests older than 5 minutes
- **Timing-Safe Comparison** - Prevents timing attacks
- **Configurable Verification** - Enable/disable signature and replay protection in trigger settings

### Input Validation

- **Email Validation** - RFC 5322 compliant validation
- **UUID Validation** - Format validation for envelope/template IDs
- **Base64 Validation** - Document content validation
- **URL Validation** - Blocks internal/private network URLs to prevent SSRF attacks:
  - localhost, 127.0.0.1, 0.0.0.0
  - Private ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x
  - Link-local: 169.254.x.x (AWS metadata endpoint)

### Token Security

- JWT tokens cached in memory only (never persisted)
- Automatic refresh 5 minutes before expiration
- RSA keys handled securely via n8n credentials

## Error Handling

The node includes built-in error handling with detailed messages:

- **Continue on Fail**: Enable to process remaining items even if some fail
- **Detailed Errors**: Field-level error details for validation failures
- **Automatic Retry**: Rate limit and server errors automatically retried

### Error Code Reference

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid or malformed request |
| 401 | Unauthorized - Invalid credentials or expired token |
| 403 | Forbidden - No permission to access resource |
| 404 | Not Found - Envelope or template does not exist |
| 429 | Rate Limited - Too many requests (auto-retry) |
| 500+ | Server Error - DocuSign server issue (auto-retry) |

## Troubleshooting

### "consent_required" Error

1. Visit the consent URL for your environment (demo or production)
2. Log in with the user account specified in credentials
3. Grant access to the integration

### "Invalid JWT" Error

1. Verify your RSA private key is complete (including BEGIN/END lines)
2. Check Integration Key (Client ID) is correct
3. Ensure User ID matches the account granting consent

### Webhook Not Receiving Events

1. Verify the webhook URL is publicly accessible
2. Check DocuSign Connect configuration matches n8n URL
3. Verify HMAC secret matches (if using signature verification)
4. Check event types are enabled in Connect settings

### Rate Limiting Issues

If you encounter rate limiting (429 errors):

1. The node automatically retries with backoff
2. Reduce frequency of API calls
3. Use "Return All" sparingly for large datasets
4. Consider caching responses where appropriate

## Development

```bash
# Install dependencies
npm install

# Build the node
npm run build

# Watch mode (rebuild on changes)
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linter
npm run lint

# Fix linting issues
npm run lintfix

# Check formatting
npm run format:check

# Format code
npm run format

# Type check
npm run typecheck
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Resources

- [DocuSign Developer Center](https://developers.docusign.com/)
- [eSignature REST API Reference](https://developers.docusign.com/docs/esign-rest-api/reference/)
- [JWT Authentication Guide](https://developers.docusign.com/platform/auth/jwt/)
- [DocuSign Connect Guide](https://developers.docusign.com/platform/webhooks/connect/)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)

## Changelog

### v0.2.0

**New Features:**
- Embedded signing URL generation (Create Signing URL operation)
- List Documents operation
- Custom fields support for envelope metadata
- Additional tab types: Initial, Date Signed, Text, Checkbox, Full Name, Email, Company, Title
- Embedded signing option in Create Envelope (adds clientUserId)
- Requirements section with DocuSign plan information

### v0.1.0

**New Features:**
- Replay attack protection for webhooks (rejects requests older than 5 minutes)
- Delete operation for draft envelopes
- CI/CD pipeline with GitHub Actions
- Mocked webhook handler tests for 100% trigger coverage

### v0.0.4

**Initial Release:**
- Full envelope management (create, send, void, download, recipients, audit)
- Template operations (get, list)
- Multiple signers and documents support
- DocuSign Trigger for real-time webhook events
- Regional support (NA, EU, AU, CA)
- JWT authentication with token caching
- Rate limiting with automatic retry
- Input validation (email, UUID, base64, URL with SSRF protection)
- HMAC-SHA256 webhook signature verification
- 61 tests with comprehensive coverage

## License

[MIT](LICENSE)

---

Made with ✍️ by [Jan Marc Coloma](https://github.com/janmaaarc)
