# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.1] - 2026-02-07

### Added
- **Merge Fields for Create From Template** - Populate document placeholders with dynamic values when using templates
- **Email Message for Create From Template** - Custom email body text option for template-based envelopes

### Changed
- **Test Coverage** - Added 2 new tests (192 total)

---

## [0.6.0] - 2026-02-07

### Added
- **Envelope Reminders & Expiration** - Configure automatic reminders and expiration deadlines on envelopes
  - Send Reminders toggle with configurable delay and frequency
  - Set Expiration toggle with configurable days and warning period
- **Recipient Authentication** - Require additional verification before signing
  - Access Code - Signer must enter a passcode
  - Phone - Signer must verify via phone call
  - SMS - Signer must verify via SMS code
- **5 New Tab Types** - More form field options for signers
  - Radio Group - Radio button selections
  - Dropdown/List - Dropdown list selection
  - Number - Numeric input field
  - Formula - Calculated fields using expressions
  - Signer Attachment - Let signers upload documents
- **Envelope Correction** - Generate correction URLs for sent envelopes to fix mistakes without voiding

### Changed
- **Test Coverage to 93.62%** - Added 19 new tests (190 total), DocuSign.node.ts now at 98.45%
- Updated TypeScript types for new tab types and notification settings

---

## [0.5.0] - 2026-02-06

### Added
- **Importable Example Workflows** - JSON workflow examples in README for easy import into n8n
- **n8n Linter Compliance** - Fixed restricted global `setTimeout` usage for n8n Cloud verification

### Changed
- **Test Coverage to 92.91%** - Added 31 new tests (171 total), DocuSign.node.ts now at 97.79%
- **Removed Deprecated Functions** - Removed `validateRequired` and `validateEmail` (use `validateField` instead)

---

## [0.4.1] - 2025-02-05

### Changed
- **Package Rename** - Renamed from `n8n-docusign-node` to `n8n-nodes-docusign-esign` for n8n Community Nodes compatibility
- Improved test coverage with 140 tests (up from 131)
- Added comprehensive tests for envelope options and merge fields

---

## [0.4.0] - 2025-02-05

### Added
- **Additional Envelope Options** - More control over envelope behavior:
  - Allow Markup - Let signers add comments and annotations to documents
  - Allow Reassign - Let signers reassign the envelope to another person
  - Brand ID - Use custom branding for the envelope
  - Enable Wet Sign - Allow signers to print and sign by hand
  - Enforce Signer Visibility - Signers can only see fields assigned to them

---

## [0.3.0] - 2025-02-05

### Added
- **Merge Fields** - Simple UI for populating document placeholders with dynamic values
  - Put placeholders like `{{FirstName}}` in your document
  - Map placeholders to values in the Merge Fields section
  - Configurable font size (Size 7-72)
  - Automatically converts to anchored text tabs behind the scenes

---

## [0.2.0] - 2025-02-02

### Added
- **Embedded Signing URL Generation** - New `Create Signing URL` operation to generate recipient view URLs for iframe integration
- **List Documents Operation** - New operation to list all documents in an envelope
- **Custom Fields Support** - Add metadata fields to envelopes for tracking and reporting
- **Additional Tab Types** - 8 new signature field types:
  - Initial Here - Signer's initials
  - Date Signed - Auto-populated signing date
  - Text - Free-form text input
  - Checkbox - Boolean checkbox field
  - Full Name - Signer's full name (auto-populated)
  - Email - Signer's email address (auto-populated)
  - Company - Company name input
  - Title - Job title input
- **Embedded Signing Option** - Toggle in Create Envelope to add `clientUserId` for embedded signing workflows
- **Requirements Documentation** - Added DocuSign plan requirements table to README

### Changed
- Improved test coverage to 70%+ with 127 tests
- DocuSignTrigger.node.ts now has 100% test coverage
- Updated README with comprehensive feature documentation

---

## [0.1.0] - 2025-02-01

### Added
- **Replay Attack Protection** - Webhook trigger now validates timestamps to reject requests older than 5 minutes
- **Delete Operation** - Delete draft envelopes (status: created)
- **CI/CD Pipeline** - GitHub Actions workflow for automated testing and npm publishing

### Changed
- Improved webhook security with optional replay protection toggle
- Better type safety with reduced unnecessary type assertions

---

## [0.0.4] - 2025-02-01

### Added
- **DocuSign Trigger Node** - Real-time webhook notifications via DocuSign Connect
  - Supports envelope events (sent, delivered, completed, declined, voided)
  - Supports recipient events (sent, delivered, completed, declined, auth failed)
  - Supports template events (created, modified, deleted)
  - HMAC-SHA256 signature verification
  - Event filtering by type
- **Regional Support** - NA, EU, AU, and CA regions for production environments
- **Multiple Signers** - Support for adding multiple signers per envelope with routing order
- **Multiple Documents** - Support for adding multiple documents per envelope
- **Envelope Operations**:
  - `Create` - Create envelope with documents and recipients
  - `Create From Template` - Create envelope from pre-configured template
  - `Get` - Get envelope details
  - `Get Many` - List envelopes with filtering and pagination
  - `Send` - Send a draft envelope
  - `Resend` - Resend notification emails to recipients
  - `Void` - Void an envelope with reason
  - `Download Document` - Download signed documents
  - `Get Recipients` - Get recipient list for an envelope
  - `Update Recipients` - Update recipient email or name
  - `Get Audit Events` - Get envelope audit trail
- **Template Operations**:
  - `Get` - Get template details
  - `Get Many` - List templates with filtering
- **Authentication**:
  - JWT authentication with RSA key
  - Token caching with automatic refresh (5 min buffer)
- **Reliability**:
  - Rate limit handling with automatic retry (up to 3 attempts)
  - Exponential backoff for server errors (5xx)
  - Configurable request timeout (default: 30 seconds)
- **Input Validation**:
  - Email validation (RFC 5322 compliant)
  - UUID validation for envelope/template IDs
  - Base64 validation for document content
  - ISO 8601 date validation
  - URL validation with SSRF protection
- **Pagination**:
  - Full pagination support for list operations
  - Configurable timeout (default: 5 minutes)
  - Memory-efficient page-by-page fetching
- **Tests** - 61 tests with comprehensive coverage
- **Documentation** - README, CHANGELOG, CONTRIBUTING, SECURITY, CLAUDE

---

## Migration Guide

### Initial Setup (v0.1.0)

#### Granting Consent
Before first use, grant consent for your integration:

**Demo:**
```
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=YOUR_INTEGRATION_KEY&redirect_uri=YOUR_REDIRECT_URI
```

**Production:**
```
https://account.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=YOUR_INTEGRATION_KEY&redirect_uri=YOUR_REDIRECT_URI
```

#### Webhook Setup
1. Go to DocuSign Admin > Integrations > Connect
2. Create a new configuration
3. Set the URL to the webhook URL from n8n
4. Configure HMAC secret (recommended: `openssl rand -hex 32`)
5. Add the same secret to your n8n credentials
