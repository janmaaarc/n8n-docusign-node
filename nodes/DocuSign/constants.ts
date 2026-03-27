/**
 * DocuSign API constants
 */

/** Production API base URL (North America - default) */
export const API_BASE_URL_PRODUCTION = 'https://na1.docusign.net/restapi/v2.1';

/** Demo/Sandbox API base URL */
export const API_BASE_URL_DEMO = 'https://demo.docusign.net/restapi/v2.1';

/**
 * Regional API base URLs for production
 */
export const REGION_URLS: Record<string, string> = {
  na: 'https://na1.docusign.net/restapi/v2.1',
  eu: 'https://eu.docusign.net/restapi/v2.1',
  au: 'https://au.docusign.net/restapi/v2.1',
  ca: 'https://ca.docusign.net/restapi/v2.1',
  demo: 'https://demo.docusign.net/restapi/v2.1',
};

/** Default timeout for API requests in milliseconds (30 seconds) */
export const DEFAULT_REQUEST_TIMEOUT_MS = 30000;

/** Default page size for list operations */
export const DEFAULT_PAGE_SIZE = 100;

/** Default signature X position (pixels from left) */
export const DEFAULT_SIGNATURE_X = 100;

/** Default signature Y position (pixels from top) */
export const DEFAULT_SIGNATURE_Y = 100;

/**
 * Envelope status options
 */
export const ENVELOPE_STATUSES = [
  { name: 'Created', value: 'created', description: 'Envelope is created but not yet sent' },
  { name: 'Sent', value: 'sent', description: 'Envelope has been sent to recipients' },
  {
    name: 'Delivered',
    value: 'delivered',
    description: 'Envelope has been delivered to recipients',
  },
  { name: 'Signed', value: 'signed', description: 'All recipients have signed' },
  { name: 'Completed', value: 'completed', description: 'Envelope signing is complete' },
  { name: 'Declined', value: 'declined', description: 'A recipient declined to sign' },
  { name: 'Voided', value: 'voided', description: 'Envelope has been voided' },
];

/**
 * Recipient types
 */
export const RECIPIENT_TYPES = [
  { name: 'Signer', value: 'signer', description: 'Recipient who needs to sign' },
  { name: 'Carbon Copy', value: 'cc', description: 'Receives a copy but does not sign' },
  { name: 'Certified Delivery', value: 'certifiedDelivery', description: 'Must confirm receipt' },
  { name: 'In Person Signer', value: 'inPersonSigner', description: 'Signs in person on a device' },
];

/**
 * Document file types supported
 */
export const SUPPORTED_DOCUMENT_TYPES = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'rtf',
  'html',
  'htm',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'tiff',
  'bmp',
];

/**
 * Resource to API endpoint mapping
 */
export const RESOURCE_ENDPOINTS: Record<string, string> = {
  envelope: 'envelopes',
  template: 'templates',
  document: 'documents',
  bulkSend: 'bulk_send_lists',
  powerForm: 'powerforms',
  folder: 'folders',
  signingGroup: 'signing_groups',
  brand: 'brands',
  envelopeLock: 'lock',
  documentGeneration: 'docGenFormFields',
  recipientTabs: 'tabs',
  comments: 'comments',
  accountUser: 'users',
  accountGroup: 'groups',
  connectConfig: 'connect',
  compositeTemplate: 'envelopes',
  paymentTab: 'envelopes',
  supplementalDoc: 'documents',
  envelopeTransfer: 'envelopes/transfer_rules',
  templateRecipients: 'recipients',
  scheduledRouting: 'workflow',
  chunkedUpload: 'chunked_uploads',
  idVerification: 'identity_verification',
  envelopeCustomField: 'custom_fields',
  envelopeAttachment: 'attachments',
  envelopeDocumentField: 'fields',
  envelopeEmailSetting: 'email_settings',
  customTab: 'tab_definitions',
  contact: 'contacts',
  permissionProfile: 'permission_profiles',
  accountCustomField: 'custom_fields',
  connectEvent: 'connect',
  billing: 'billing_plan',
  cloudStorage: 'cloud_storage',
  workspace: 'workspaces',
  emailArchive: 'email_archive',
  diagnostics: 'diagnostics',
  notary: 'notary',
  trustServiceProvider: 'trust_service_providers',
  envelopeNotification: 'notification',
  templateCustomField: 'custom_fields',
  templateDocument: 'documents',
  templateLock: 'lock',
  templateNotification: 'notification',
  envelopePurge: 'envelopes',
  accountSettings: 'settings',
  templateView: 'templates',
  reporting: 'reports',
  accountSignature: 'signatures',
  accountWatermark: 'watermark',
  captiveRecipient: 'captive_recipients',
  consumerDisclosure: 'consumer_disclosure',
  notaryJournal: 'notary/journals',
  templateBulkRecipient: 'templates',
};

/**
 * Resource to ID parameter mapping
 */
export const RESOURCE_ID_PARAMS: Record<string, string> = {
  envelope: 'envelopeId',
  template: 'templateId',
  document: 'documentId',
  bulkSend: 'listId',
  powerForm: 'powerFormId',
  folder: 'folderId',
  signingGroup: 'signingGroupId',
  brand: 'brandId',
  envelopeLock: 'envelopeId',
  recipientTabs: 'envelopeId',
  comments: 'envelopeId',
  accountUser: 'userId',
  accountGroup: 'groupId',
  connectConfig: 'connectId',
  envelopeTransfer: 'transferRuleId',
  templateRecipients: 'templateId',
  scheduledRouting: 'envelopeId',
  chunkedUpload: 'chunkedUploadId',
  envelopeCustomField: 'envelopeId',
  envelopeAttachment: 'envelopeId',
  envelopeDocumentField: 'envelopeId',
  envelopeEmailSetting: 'envelopeId',
  customTab: 'customTabId',
  contact: 'contactId',
  permissionProfile: 'permissionProfileId',
  accountCustomField: 'fieldId',
  connectEvent: 'failureId',
  billing: '',
  cloudStorage: 'serviceId',
  workspace: 'workspaceId',
  emailArchive: 'bccEmailArchiveId',
  diagnostics: '',
  notary: '',
  trustServiceProvider: '',
  envelopeNotification: 'envelopeId',
  templateCustomField: 'templateId',
  templateDocument: 'templateId',
  templateLock: 'templateId',
  templateNotification: 'templateId',
  envelopePurge: 'envelopeId',
  accountSettings: '',
  templateView: 'templateId',
  reporting: '',
  accountSignature: 'signatureId',
  accountWatermark: '',
  captiveRecipient: '',
  consumerDisclosure: '',
  notaryJournal: 'journalId',
  templateBulkRecipient: 'templateId',
};

/**
 * System search folder IDs for folder search operations
 */
export const SEARCH_FOLDER_IDS = [
  { name: 'Drafts', value: 'drafts', description: 'Draft envelopes' },
  {
    name: 'Awaiting My Signature',
    value: 'awaiting_my_signature',
    description: 'Envelopes waiting for your signature',
  },
  { name: 'Completed', value: 'completed', description: 'Completed envelopes' },
  {
    name: 'Out for Signature',
    value: 'out_for_signature',
    description: 'Envelopes sent out for signature',
  },
  { name: 'Inbox', value: 'inbox', description: 'Received envelopes' },
  { name: 'Sent Items', value: 'sentitems', description: 'Sent envelopes' },
  { name: 'Recycled', value: 'recyclebin', description: 'Deleted envelopes' },
];

/**
 * Signature tab types
 */
export const TAB_TYPES = [
  { name: 'Signature', value: 'signHereTabs', description: 'Signature field' },
  { name: 'Initial', value: 'initialHereTabs', description: 'Initials field' },
  { name: 'Date Signed', value: 'dateSignedTabs', description: 'Auto-populated date field' },
  { name: 'Text', value: 'textTabs', description: 'Free-text input field' },
  { name: 'Checkbox', value: 'checkboxTabs', description: 'Checkbox field' },
];

/**
 * Envelope lock types
 */
export const LOCK_TYPES = [
  { name: 'Edit', value: 'edit', description: 'Lock for editing' },
];
