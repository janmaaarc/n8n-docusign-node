# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| 0.11.x  | :white_check_mark: |
| 0.10.x  | :white_check_mark: |
| 0.9.x   | :white_check_mark: |
| 0.8.x   | :white_check_mark: |
| 0.7.x   | :white_check_mark: |
| 0.6.x   | :white_check_mark: |
| 0.5.x   | :white_check_mark: |
| 0.4.x   | :white_check_mark: |
| 0.3.x   | :white_check_mark: |
| 0.2.x   | :white_check_mark: |
| 0.1.x   | :white_check_mark: |
| 0.0.x   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email the maintainer directly at: janmarccolomaaa@gmail.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

You can expect:
- Acknowledgment within 48 hours
- Status update within 7 days
- Credit in the security advisory (if desired)

## Security Features

This node implements several security measures:

### Authentication Security

- **JWT Token Caching**: Tokens are cached in memory only, never persisted to disk
- **Token Refresh**: Tokens are refreshed 5 minutes before expiration
- **RSA Key Handling**: Private keys are handled securely through n8n's credential system

### Webhook Security

- **HMAC-SHA256 Signature Verification**: All webhooks are verified using HMAC-SHA256 signatures
- **Replay Attack Protection**: Rejects webhook requests older than 5 minutes to prevent replay attacks
- **Timing-Safe Comparison**: Signature verification uses `crypto.timingSafeEqual` to prevent timing attacks
- **Secret Management**: Webhook secrets stored securely in n8n credentials
- **Configurable Verification**: Both signature verification and replay protection can be toggled in trigger settings

### Input Validation

- **Email Validation**: RFC 5322 compliant validation
- **UUID Validation**: Strict UUID format validation for envelope/template IDs
- **Base64 Validation**: Document content validation before upload
- **Date Validation**: ISO 8601 format validation
- **URL Validation**: Blocks internal/private network URLs to prevent SSRF attacks:
  - localhost, 127.0.0.1, 0.0.0.0
  - IPv6 loopback (::1, [::1])
  - Private ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x
  - Link-local: 169.254.x.x (AWS metadata endpoint)

### API Security

- **Bearer Token Authentication**: JWT tokens transmitted securely via Authorization header
- **HTTPS Only**: All API communication uses HTTPS
- **Rate Limit Handling**: Automatic retry with backoff prevents API abuse

### Error Handling

- **Safe Error Messages**: API errors are sanitized before display
- **No Credential Exposure**: Tokens and keys are never logged or exposed in errors
- **Filtered Sensitive Data**: Errors containing "token", "key", or "secret" are redacted

## Best Practices for Users

1. **Credential Management**
   - Store credentials securely in n8n
   - Rotate RSA keys periodically
   - Use separate integration keys for test/production

2. **Webhook Configuration**
   - Use strong, random webhook secrets (32+ characters)
   - Generate with: `openssl rand -hex 32`
   - Keep webhook URLs private
   - Monitor webhook logs for anomalies

3. **Environment Selection**
   - Always test with demo environment first
   - Use production only for live workflows

## Security Changelog

### v1.0.0
- Consumer disclosure langCode path injection protection (encodeURIComponent)
- Cloud storage serviceId/folderId path injection protection (encodeURIComponent)
- OAuth2 credential with webhookSecret field for trigger signature verification
- Captive recipient email validation (RFC 5322)
- Envelope purge envelope ID validation (UUID format)
- Template view return URL validation (SSRF-safe HTTPS URL)
- Template bulk recipient template ID validation (UUID format)
- Account signature name validation (required, non-empty)
- Maintained all existing security features

### v0.11.0
- Envelope notification envelope ID validation (UUID format)
- Template document template ID and document ID validation (UUID format)
- Template document name validation (required, non-empty)
- Template custom field template ID validation (UUID format)
- Template custom field name validation (required, non-empty)
- Template lock template ID validation (UUID format)
- Template lock token validation for update/delete operations
- Template lock X-DocuSign-Edit header for secure lock operations
- Template notification template ID validation (UUID format)
- Email archive email validation (RFC 5322)
- Email archive BCC ID validation (required, non-empty)
- Notary email validation (RFC 5322) and name validation
- Cloud storage service ID validation (required, non-empty)
- Cloud storage folder ID validation (required, non-empty)
- Workspace name validation (required, non-empty)
- Diagnostics request log ID validation (required, non-empty)
- Maintained all existing security features

### v0.10.0
- Envelope custom field validation (envelope ID as UUID)
- Envelope attachment content validation (base64 format)
- Envelope document field validation (envelope ID + document ID as UUID)
- Envelope email settings reply-to email validation (RFC 5322)
- Custom tab label validation (required, non-empty)
- Contact email validation (RFC 5322) and name validation
- Permission profile name validation (required, non-empty)
- Permission profile ID validation for get/update/delete
- Account custom field name validation (required, non-empty)
- Connect event failure ID validation (required, non-empty)
- Connect event log date filter validation
- Sender/edit view return URL validation (SSRF-safe URL validation)
- PowerForm ID validation for form data retrieval (UUID format)
- Maintained all existing security features

### v0.9.0
- Payment tab amount validation (positive numbers, numeric format)
- Payment currency code validation (ISO 4217 allowlist)
- Connect Configuration webhook URL validation (SSRF protection for webhook URLs)
- Account user email validation for all user CRUD operations
- Template recipient email validation
- Envelope transfer user email validation (from/to)
- Chunked upload session ID validation and size validation (positive numbers)
- Chunked upload data validation (base64 format)
- Composite template ID validation (UUID format per template)
- Scheduled routing date validation (ISO 8601 format)
- ID verification workflow ID format preserved from API
- Maintained all existing security features

### v0.8.0
- Envelope lock token validation for lock update/unlock operations
- Signing group member email validation
- Brand ID validation for get/update/delete operations
- Document generation form field validation
- SMS phone number validation for delivery notifications
- Custom `X-DocuSign-Edit` header support for secure lock operations
- Maintained all existing security features

### v0.7.0
- Bulk send recipient email validation before list creation
- PowerForm template ID validation (UUID format)
- Folder envelope ID validation for move operations
- Folder search date filter validation (ISO 8601)
- Maintained all existing security features

### v0.6.0
- Added recipient authentication options (access code, phone, SMS) for enhanced signing security
- Correction URL validation uses existing SSRF-safe URL validator
- Maintained all existing security features

### v0.5.0
- Replaced restricted global `setTimeout` with `node:timers/promises` for n8n linter compliance
- Removed deprecated validation functions (`validateRequired`, `validateEmail`)
- Maintained all existing security features

### v0.4.1
- No security-related changes (maintenance release)
- Maintained all existing security features

### v0.4.0
- No security-related changes (feature release)
- Maintained all existing security features

### v0.3.0
- No security-related changes (feature release)
- Maintained all existing security features

### v0.2.0
- No security-related changes (feature release)
- Maintained all existing security features

### v0.1.0
- Added replay attack protection for webhooks (rejects requests older than 5 minutes)
- Made signature verification and replay protection configurable via toggle
- Improved type safety with reduced unnecessary type assertions

### v0.0.4
- Initial release with comprehensive security features
- JWT token caching with automatic refresh
- HMAC-SHA256 webhook signature verification
- Input validation for emails, UUIDs, base64, dates, URLs
- SSRF protection for URL inputs
- Error message sanitization
- Rate limit handling with exponential backoff
