# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-27

### Added

#### New Resources
- **Envelope Purge** - Purge document content from completed envelopes (GDPR/data retention compliance)
  - Purge Documents - Set purge state on completed envelopes
- **Account Settings** - Manage account-level configuration
  - Get - Retrieve all account settings
  - Update - Modify account settings via JSON
- **Template Views** - Generate template editing URLs
  - Create Edit View - Generate URL for editing a template in the DocuSign UI
- **Reporting** - Account reports and analytics
  - Get Product Permission Profiles - Retrieve permission profiles report
  - Get Account Report - Retrieve account reports with date filters
- **Account Signatures** - Manage stamp and signature images
  - Create / Get / Get Many / Update / Delete - Full CRUD for account signatures
- **Account Watermarks** - Configure document watermarks
  - Get / Update / Preview - Manage watermark text, font, and appearance
- **Captive Recipients** - Manage embedded (captive) recipient sessions
  - Create - Register embedded signers with client user IDs
  - Delete - Remove captive recipient signatures
- **Consumer Disclosures** - ESIGN Act compliance
  - Get - Retrieve disclosure for specific envelope recipient
  - Get Default - Retrieve account-level default disclosure
  - Update - Modify account disclosure text
- **Notary Journals** - Remote online notarization journal entries
  - Get / Get Many - Retrieve notary journal entries with pagination
- **Template Bulk Recipients** - CSV-based bulk recipient management
  - Upload - Upload CSV file of bulk recipients for a template
  - Get - Retrieve bulk recipient list
  - Delete - Remove bulk recipients

#### Enhancements
- **Binary File Downloads** - Template document downloads now return actual file content as binary data (Buffer) instead of JSON metadata
- **Credential Test** - Validate DocuSign credentials from the n8n credential editor UI
- **OAuth2 Authentication** - Authorization Code Grant flow as alternative to JWT for user-level authorization
  - New DocuSign OAuth2 API credential type
  - Both nodes (DocuSign + DocuSign Trigger) support JWT and OAuth2
- **Webhook Trigger Enhancements** - Advanced filtering and new events
  - Filter by Envelope ID - Only trigger for specific envelopes
  - Filter by Sender Email - Only trigger for specific senders
  - Include Raw Payload option
  - 5 new events: envelope-resent, envelope-corrected, envelope-purge, recipient-reassigned, recipient-finish-later

### Changed
- **604 Total Tests** - Added 52 new tests across 12 feature test files
- Added 10 new resource definitions (43 → 53 total resources)
- Added 24 new handler functions and 10 dispatch blocks
- Added 8 new type definitions (types.ts)
- Bumped version to 1.0.0 (production-ready)

---

## [0.11.0] - 2026-03-01

### Added

#### Envelope & Template Sub-Resources
- **Envelope Notifications** - Manage reminder and expiration settings on individual envelopes
  - Get - Retrieve notification settings for an envelope
  - Update - Configure reminders (delay, frequency) and expiration (days, warning period)
- **Template Documents** - Manage documents within templates
  - Add - Upload new documents to a template with base64 content
  - Get - Retrieve a specific document from a template
  - Get Many - List all documents in a template
  - Remove - Remove a document from a template
- **Template Custom Fields** - Manage custom metadata fields on templates
  - Create - Add text custom fields with show/required options
  - Get - Retrieve custom fields for a template
  - Update - Modify custom field values
  - Delete - Remove custom fields from a template
- **Template Locks** - Prevent concurrent editing of templates
  - Lock - Lock a template for editing with configurable duration
  - Get Lock - Check current lock status
  - Update Lock - Extend or modify an existing lock (X-DocuSign-Edit header)
  - Unlock - Release a template lock
- **Template Notifications** - Manage default reminder and expiration settings on templates
  - Get - Retrieve notification settings for a template
  - Update - Configure reminders and expiration defaults

#### Account & Administration
- **Billing** - Retrieve billing information for the account
  - Get Plan - Retrieve current billing plan details
  - Get Invoice / Get Many Invoices - Retrieve billing invoices
  - Get Payment / Get Many Payments - Retrieve billing payment history
- **Email Archive** - Manage BCC compliance email archiving
  - Create - Add BCC email archive addresses (RFC 5322 validated)
  - Get Many - List all BCC email archive configurations
  - Delete - Remove BCC email archive addresses
- **Diagnostics** - Manage API request logging for troubleshooting
  - Get Settings - Retrieve current diagnostics settings
  - Update Settings - Enable or disable API request logging
  - Get Log - Retrieve a specific API request log entry

#### External Services
- **Cloud Storage** - Browse cloud storage providers connected to the account
  - List Providers - List all connected cloud storage providers
  - List Files - Browse files in a provider folder
  - Get File - Retrieve a specific file from cloud storage
- **Workspaces** - Manage collaboration workspaces
  - Create - Create a new workspace
  - Get / Get Many - Retrieve workspace details
  - Delete - Remove a workspace
  - Create File - Upload a file to a workspace folder
  - Get Files - List files in a workspace folder
- **Notary** - Remote online notarization (RON) support
  - Get - Retrieve notary profile
  - Get Jurisdictions - List available notary jurisdictions
  - Create - Register a notary profile with commission details
- **Trust Service Providers** - EU eIDAS electronic seal providers
  - Get Seal Providers - List available seal providers for electronic seals

### Changed
- **552 Total Tests** - Added 83 new tests across 12 feature test files
- Added 12 new resource definitions (31 → 43 total resources)
- Added 40 new handler functions and 12 dispatch blocks
- Added 12 new type definitions (types.ts)
- Extended resource endpoint mapping (constants.ts)

---

## [0.10.0] - 2026-02-24

### Added

#### Envelope Enhancements
- **Envelope Form Data** - Retrieve form field data entered by recipients
  - Get Form Data - GET `/envelopes/{id}/form_data`
- **Envelope Views Extended** - Generate sender and edit view URLs
  - Create Sender View - Generate URL for sender to view envelope
  - Create Edit View - Generate URL for editing envelope in DocuSign UI
- **Envelope Custom Fields** - Manage custom metadata fields on individual envelopes
  - Create - Add text or list custom fields
  - Get - Retrieve custom fields for an envelope
  - Update - Modify existing custom field values
  - Delete - Remove custom fields from an envelope
- **Envelope Attachments** - Manage file attachments on envelopes
  - Get Many - List all attachments on an envelope
  - Create - Add attachments with base64-encoded content
  - Delete - Remove attachments from an envelope
- **Envelope Document Fields** - Manage custom fields on individual documents within envelopes
  - Get - Retrieve document fields
  - Create - Add custom fields to a document
  - Update - Modify document field values
  - Delete - Remove fields from a document
- **Envelope Email Settings** - Control email behavior per envelope
  - Get - Retrieve email settings (reply-to, BCC)
  - Create - Configure email overrides for an envelope
  - Update - Modify email settings
  - Delete - Remove email setting overrides

#### Account Management
- **Custom Tabs** - Manage reusable tab definitions for consistent field formatting
  - Create - Define tab with type (text, number, date, list, checkbox, radio, note)
  - Get / Get Many - Retrieve tab definitions
  - Update - Modify tab properties (label, font, bold, required)
  - Delete - Remove tab definitions
- **Contacts** - Manage DocuSign address book contacts
  - Create - Add contacts with name, email, and optional organization
  - Get Many - List contacts with pagination
  - Update - Modify contact details
  - Delete - Remove contacts
- **Permission Profiles** - Manage account permission profiles for user access control
  - Create - Define profiles with granular permissions (send, manage templates, etc.)
  - Get / Get Many - Retrieve permission profiles
  - Update - Modify profile name and permission settings
  - Delete - Remove permission profiles
- **Account Custom Fields** - Manage account-level custom field definitions
  - Create - Define text or list type fields with optional required/show settings
  - Get Many - List all account custom fields
  - Update - Modify field properties
  - Delete - Remove field definitions

#### PowerForm Enhancements
- **PowerForm Data** - Retrieve PowerForm submission data
  - Get Form Data - GET `/powerforms/{id}/form_data`

#### Advanced Features
- **Connect Events** - Monitor and manage DocuSign Connect delivery events
  - Get Failures - Retrieve failed Connect deliveries
  - Get Logs - Query delivery logs with date filters
  - Retry - Retry a failed delivery by failure ID

### Changed
- **469 Total Tests** - Added 77 new tests across 11 feature test files
- Added 9 new resource definitions (22 → 31 total resources)
- Added 40 new handler functions and 12 dispatch blocks
- Added 9 new type definitions (types.ts)
- Extended resource endpoint mapping (constants.ts)

---

## [0.9.0] - 2026-02-20

### Added

#### Envelope Enhancements
- **Composite Templates** - Create envelopes combining multiple server templates with inline recipients
  - Supports comma-separated template IDs with automatic sequencing
  - Inline recipient override per template
- **Envelope Transfer** - Manage envelope ownership transfer rules
  - Get Rules - List all transfer rules
  - Create Rule - Transfer envelopes between users
  - Update Rule - Enable/disable or change target user
  - Delete Rule - Remove transfer rules
- **Supplemental Documents** - Attach supplemental documents (terms & conditions, disclosures) to envelopes
  - Modal or inline display modes
  - Configurable acknowledgment requirements (no interaction, view, accept)
- **Scheduled Routing** - Schedule envelope delivery for a future date
  - Get - Retrieve workflow rules
  - Update - Set scheduled send date
  - Delete - Remove scheduled routing

#### Recipient & Tab Management
- **Recipient Tabs** - Get and update tabs for specific recipients on sent envelopes
  - Get Tabs - Retrieve all tabs for a recipient
  - Update Tabs - Modify text and checkbox tab values
- **Payment Tabs** - Create envelopes with payment collection during signing
  - ISO 4217 currency code support (USD, EUR, GBP, CAD, AUD, JPY)
  - Payment amount validation (positive numbers only)
  - Payment gateway integration
- **Template Recipients** - Full recipient management on templates
  - Create - Add signer, CC, or certified delivery recipients
  - Get Many - Retrieve all template recipients
  - Update - Modify email, name, or role
  - Delete - Remove recipients from templates
- **ID Verification** - Identity verification workflows
  - Get Workflows - List available IDV workflows for the account

#### Administration
- **Connect Configuration** - Manage DocuSign Connect webhook configurations programmatically
  - Create - Set up webhook with URL, events, and options
  - Get / Get Many - Retrieve configurations
  - Update - Modify name, URL, or enable/disable
  - Delete - Remove configurations
  - SSRF protection on webhook URLs
- **Account Users** - Manage users in the DocuSign account
  - Create - Add new users with optional company/job title
  - Get / Get Many - Retrieve user details with status/email filters
  - Update - Modify email, name, company, job title
  - Delete - Remove users
- **Account Groups** - Manage permission groups
  - Create - Create groups with optional permission profile
  - Get Many - List all groups
  - Update - Modify name or permission profile
  - Delete - Remove groups

#### Advanced Features
- **Chunked Uploads** - Upload large documents (>25MB) in chunks
  - Initiate - Start upload session with content type and total size
  - Upload Chunk - Send individual base64-encoded chunks
  - Commit - Finalize the upload
- **Comments API** - Add and retrieve comments on envelopes
  - Create - Add comments with optional thread reply
  - Get Many - Retrieve comments with pagination

### Changed
- **392 Total Tests** - Added 72 new tests across 13 feature test files
- Added 13 new resource definitions, handler functions, and dispatch cases
- Added new type definitions for all features (types.ts)
- Extended resource endpoint mapping (constants.ts)
- Modular test structure with shared mock context (`test/setup/`)

---

## [0.8.0] - 2026-02-10

### Added
- **Signing Groups** - Shared signing where any group member can sign on behalf of the group
  - Create - Create signing groups with named members
  - Get / Get Many - Retrieve signing group details
  - Update - Modify group name or members
  - Delete - Remove signing groups
- **Brand Management** - Custom branding for envelopes and signing experience
  - Create - Create brand profiles with company name and language
  - Get / Get Many - Retrieve brand details
  - Update - Modify brand name and properties
  - Delete - Remove brands
- **Document Generation** - Populate Word templates with dynamic data (DocGen)
  - Get Form Fields - Retrieve available form fields from draft envelopes
  - Update Form Fields - Populate form fields with values before sending
- **Envelope Lock Management** - Prevent concurrent editing of envelopes
  - Lock - Lock an envelope for editing with configurable duration
  - Get Lock - Check current lock status
  - Update Lock - Extend or modify an existing lock
  - Unlock - Release an envelope lock
- **SMS Delivery** - Send signing notifications via SMS in addition to email
  - Configure country code and phone number per signer in envelope create

### Changed
- **Test Coverage to 96.5%** - Added 53 new tests (320 total), DocuSign.node.ts at 99.76%
- Added optional `headers` parameter to `docuSignApiRequest` for custom header support

---

## [0.7.0] - 2026-02-08

### Added
- **Bulk Send** - Send envelopes to 100+ recipients at once
  - Create List - Build bulk send lists with named recipients and roles
  - Get List / Get Many Lists - Retrieve bulk send list details
  - Delete List - Remove bulk send lists
  - Send - Trigger bulk send using a list and envelope/template
  - Get Batch Status - Monitor batch progress (sent, failed, queued)
- **Template CRUD** - Full template lifecycle management
  - Create - Create templates with documents and signer roles
  - Update - Modify template name, description, and email subject
  - Delete - Remove templates
- **PowerForms** - Self-service signing links
  - Create - Create PowerForms from templates with optional email, mobile, and usage limits
  - Get / Get Many - Retrieve PowerForm details
  - Delete - Remove PowerForms
- **Folder Management** - Organize envelopes in folders
  - Get Many - List all account folders
  - Get Items - List envelopes in a folder with pagination
  - Move Envelope - Move envelopes between folders
  - Search - Search across system folders with text, date, and status filters

### Changed
- **Test Coverage to 95.6%** - Added 75 new tests (267 total), DocuSign.node.ts now at 99.67%
- Extracted `resolveDocumentBase64` helper for shared document handling across envelope and template create

---

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
