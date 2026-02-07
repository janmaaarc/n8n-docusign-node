/**
 * DocuSign API type definitions
 */

import type { IDataObject } from 'n8n-workflow';

/**
 * DocuSign environment options
 */
export type DocuSignEnvironment = 'production' | 'demo';

/**
 * Envelope status types
 */
export type EnvelopeStatus =
  | 'created'
  | 'sent'
  | 'delivered'
  | 'signed'
  | 'completed'
  | 'declined'
  | 'voided';

/**
 * Recipient type options
 */
export type RecipientType = 'signer' | 'cc' | 'certifiedDelivery' | 'inPersonSigner';

/**
 * Signer recipient object
 */
export interface DocuSignSigner {
  email: string;
  name: string;
  recipientId: string;
  routingOrder?: string;
  tabs?: DocuSignTabs;
}

/**
 * Carbon copy recipient object
 */
export interface DocuSignCarbonCopy {
  email: string;
  name: string;
  recipientId: string;
  routingOrder?: string;
}

/**
 * Tabs (signature fields) object
 */
export interface DocuSignTabs {
  signHereTabs?: DocuSignTab[];
  initialHereTabs?: DocuSignTab[];
  dateSignedTabs?: DocuSignTab[];
  textTabs?: DocuSignTab[];
  checkboxTabs?: DocuSignTab[];
  radioGroupTabs?: DocuSignRadioGroupTab[];
  listTabs?: DocuSignTab[];
  numberTabs?: DocuSignTab[];
  formulaTabs?: DocuSignTab[];
  signerAttachmentTabs?: DocuSignTab[];
}

/**
 * Radio group tab with nested radio items
 */
export interface DocuSignRadioGroupTab {
  documentId: string;
  groupName: string;
  radios: DocuSignRadioItem[];
}

/**
 * Individual radio button item
 */
export interface DocuSignRadioItem {
  pageNumber: string;
  xPosition: string;
  yPosition: string;
  value: string;
  selected: string;
}

/**
 * Notification settings for envelope reminders and expiration
 */
export interface DocuSignNotification {
  useAccountDefaults: string;
  reminders?: {
    reminderEnabled: string;
    reminderDelay: string;
    reminderFrequency: string;
  };
  expirations?: {
    expireEnabled: string;
    expireAfter: string;
    expireWarn: string;
  };
}

/**
 * Individual tab (field) object
 */
export interface DocuSignTab {
  documentId: string;
  pageNumber: string;
  xPosition?: string;
  yPosition?: string;
  anchorString?: string;
  anchorXOffset?: string;
  anchorYOffset?: string;
}

/**
 * Document object for envelope
 */
export interface DocuSignDocument {
  documentBase64?: string;
  documentId: string;
  fileExtension?: string;
  name: string;
  uri?: string;
}

/**
 * Envelope recipients object
 */
export interface DocuSignRecipients {
  signers?: DocuSignSigner[];
  carbonCopies?: DocuSignCarbonCopy[];
  certifiedDeliveries?: DocuSignCarbonCopy[];
  inPersonSigners?: DocuSignSigner[];
}

/**
 * Envelope definition object
 */
export interface DocuSignEnvelopeDefinition {
  emailSubject: string;
  documents?: DocuSignDocument[];
  recipients?: DocuSignRecipients;
  status?: EnvelopeStatus;
  templateId?: string;
  templateRoles?: DocuSignTemplateRole[];
}

/**
 * Template role for using templates
 */
export interface DocuSignTemplateRole {
  email: string;
  name: string;
  roleName: string;
  tabs?: DocuSignTabs;
}

/**
 * Envelope summary response
 */
export interface DocuSignEnvelopeSummary {
  envelopeId: string;
  status: EnvelopeStatus;
  statusDateTime: string;
  uri: string;
}

/**
 * Envelope details response
 */
export interface DocuSignEnvelope {
  envelopeId: string;
  status: EnvelopeStatus;
  emailSubject: string;
  sentDateTime?: string;
  createdDateTime: string;
  completedDateTime?: string;
  recipients?: DocuSignRecipients;
  documents?: DocuSignDocument[];
}

/**
 * List envelopes response
 */
export interface DocuSignEnvelopesResponse {
  envelopes?: DocuSignEnvelope[];
  resultSetSize: string;
  totalSetSize: string;
  startPosition: string;
  endPosition: string;
  nextUri?: string;
  previousUri?: string;
}

/**
 * Template object
 */
export interface DocuSignTemplate {
  templateId: string;
  name: string;
  description?: string;
  created: string;
  lastModified: string;
  uri: string;
}

/**
 * List templates response
 */
export interface DocuSignTemplatesResponse {
  envelopeTemplates?: DocuSignTemplate[];
  resultSetSize: string;
  totalSetSize: string;
  startPosition: string;
  endPosition: string;
  nextUri?: string;
  previousUri?: string;
}

/**
 * Formatted output for n8n workflow
 */
export interface DocuSignOutput extends IDataObject {
  envelopeId?: string;
  status?: string;
  emailSubject?: string;
  createdDateTime?: string;
  sentDateTime?: string;
  completedDateTime?: string;
}

/**
 * Pagination options for list operations
 */
export interface PaginationOptions {
  /** Maximum number of items to return */
  maxItems?: number;
  /** Timeout in milliseconds (default: 300000 = 5 minutes) */
  timeout?: number;
  /** Page size for each request (default: 100) */
  pageSize?: number;
}
