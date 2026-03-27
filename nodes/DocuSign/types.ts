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
 * Bulk send copy (one recipient in a bulk send list)
 */
export interface DocuSignBulkCopy {
  recipients: DocuSignRecipients;
  customFields?: IDataObject[];
}

/**
 * Bulk send list
 */
export interface DocuSignBulkSendList {
  listId?: string;
  name: string;
  bulkCopies: DocuSignBulkCopy[];
}

/**
 * Bulk send batch status
 */
export interface DocuSignBulkSendBatchStatus {
  batchId: string;
  batchSize: string;
  totalQueued: string;
  totalSent: string;
  totalFailed: string;
}

/**
 * PowerForm definition
 */
export interface DocuSignPowerForm {
  powerFormId?: string;
  templateId: string;
  name: string;
  emailSubject?: string;
  emailBody?: string;
  signerCanSignOnMobile?: string;
  isActive?: string;
}

/**
 * Folder definition
 */
export interface DocuSignFolder {
  folderId: string;
  name: string;
  type: string;
  uri: string;
  parentFolderId?: string;
  subFolders?: DocuSignFolder[];
}

/**
 * Folder items response
 */
export interface DocuSignFolderItemsResponse {
  folderItems?: IDataObject[];
  resultSetSize: string;
  totalSetSize: string;
  startPosition: string;
  endPosition: string;
}

/**
 * Signing group definition
 */
export interface DocuSignSigningGroup {
  signingGroupId?: string;
  groupName: string;
  groupType?: string;
  users?: DocuSignSigningGroupUser[];
}

/**
 * Signing group member
 */
export interface DocuSignSigningGroupUser {
  email: string;
  userName: string;
}

/**
 * Brand definition
 */
export interface DocuSignBrand {
  brandId?: string;
  brandName: string;
  brandCompany?: string;
  isOverridingCompanyName?: boolean;
  defaultBrandLanguage?: string;
}

/**
 * Envelope lock definition
 */
export interface DocuSignEnvelopeLock {
  lockDurationInSeconds?: string;
  lockType?: string;
  lockedByApp?: string;
  lockToken?: string;
  expiresIn?: string;
}

/**
 * Document generation form field
 */
export interface DocuSignDocGenFormField {
  name: string;
  value: string;
  type?: string;
  documentId?: string;
}

/**
 * SMS delivery notification for recipients
 */
export interface DocuSignAdditionalNotification {
  secondaryDeliveryMethod: string;
  phoneNumber: {
    countryCode: string;
    number: string;
  };
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

/**
 * Connect configuration (webhook)
 */
export interface DocuSignConnectConfig {
  connectId?: string;
  name: string;
  urlToPublishTo: string;
  allowEnvelopePublish?: string;
  enableLog?: string;
  eventData?: IDataObject;
}

/**
 * Account user
 */
export interface DocuSignAccountUser {
  userId?: string;
  userName: string;
  email: string;
  company?: string;
  jobTitle?: string;
  userStatus?: string;
}

/**
 * Account permission group
 */
export interface DocuSignAccountGroup {
  groupId?: string;
  groupName: string;
  groupType?: string;
  permissionProfileId?: string;
  usersCount?: string;
}

/**
 * Envelope transfer rule
 */
export interface DocuSignTransferRule {
  envelopeTransferRuleId?: string;
  fromUser?: { userId?: string; email?: string };
  toUser?: { userId?: string; email?: string };
  carbonCopyOriginalOwner?: string;
  enabled?: string;
}

/**
 * Chunked upload session
 */
export interface DocuSignChunkedUpload {
  chunkedUploadId?: string;
  chunkedUploadUri?: string;
  committed?: string;
  expirationDateTime?: string;
  totalSize?: string;
}

/**
 * Envelope comment
 */
export interface DocuSignComment {
  commentId?: string;
  text?: string;
  threadId?: string;
  timeStampFormatted?: string;
  senderName?: string;
  senderEmail?: string;
}

/**
 * Identity verification workflow
 */
export interface DocuSignIdVerificationWorkflow {
  workflowId: string;
  workflowLabel: string;
  defaultName?: string;
  type?: string;
}

/**
 * Composite template definition
 */
export interface DocuSignCompositeTemplate {
  compositeTemplateId?: string;
  serverTemplates?: Array<{
    sequence: string;
    templateId: string;
  }>;
  inlineTemplates?: Array<{
    sequence: string;
    recipients?: DocuSignRecipients;
  }>;
}

/**
 * Payment line item for payment tabs
 */
export interface DocuSignPaymentLineItem {
  name: string;
  description?: string;
  amountReference?: string;
  amount?: string;
}

/**
 * Payment details for payment tabs
 */
export interface DocuSignPaymentDetails {
  currencyCode: string;
  gatewayAccountId: string;
  lineItems: DocuSignPaymentLineItem[];
  total?: string;
}

/**
 * Scheduled routing / workflow definition
 */
export interface DocuSignWorkflow {
  workflowStatus?: string;
  scheduledSending?: {
    rules?: Array<{
      resumeDate?: string;
    }>;
  };
}

/**
 * Envelope custom field
 */
export interface DocuSignEnvelopeCustomField {
  fieldId?: string;
  name: string;
  value?: string;
  show?: string;
  required?: string;
}

/**
 * Custom tab (field) definition
 */
export interface DocuSignCustomTab {
  customTabId?: string;
  tabLabel: string;
  type?: string;
  anchor?: string;
  font?: string;
  bold?: string;
  width?: number;
  height?: number;
  required?: string;
  locked?: string;
}

/**
 * Address book contact
 */
export interface DocuSignContact {
  contactId?: string;
  name?: string;
  emails?: string[];
  organization?: string;
  shared?: string;
  signingGroupId?: string;
}

/**
 * Connect webhook event log entry
 */
export interface DocuSignConnectEvent {
  failureId?: string;
  connectConfigId?: string;
  envelopeId?: string;
  status?: string;
  statusMessage?: string;
  created?: string;
  retryCount?: number;
}

/**
 * Permission profile for account users
 */
export interface DocuSignPermissionProfile {
  permissionProfileId?: string;
  permissionProfileName?: string;
  settings?: Record<string, string>;
}

/**
 * Envelope file attachment
 */
export interface DocuSignEnvelopeAttachment {
  attachmentId?: string;
  name?: string;
  data?: string;
  accessControl?: string;
  attachmentType?: string;
}

/**
 * Account-level custom field definition
 */
export interface DocuSignAccountCustomField {
  fieldId?: string;
  name?: string;
  type?: string;
  required?: string;
  show?: string;
  listItems?: string[];
}

/**
 * Document-level custom field
 */
export interface DocuSignEnvelopeDocumentField {
  name?: string;
  value?: string;
}

/**
 * Envelope email settings override
 */
export interface DocuSignEnvelopeEmailSetting {
  replyEmailAddressOverride?: string;
  replyEmailNameOverride?: string;
  bccEmailAddresses?: Array<{
    bccEmailAddressId?: string;
    email?: string;
  }>;
}

/**
 * Billing plan details
 */
export interface DocuSignBillingPlan {
  planId?: string;
  planName?: string;
  paymentCycle?: string;
  currencyCode?: string;
  planFeatureSets?: IDataObject[];
}

/**
 * Billing invoice
 */
export interface DocuSignBillingInvoice {
  invoiceId?: string;
  amount?: string;
  invoiceDate?: string;
  dueDate?: string;
  status?: string;
}

/**
 * Billing payment
 */
export interface DocuSignBillingPayment {
  paymentId?: string;
  amount?: string;
  paymentDate?: string;
  paymentType?: string;
}

/**
 * Cloud storage provider
 */
export interface DocuSignCloudStorageProvider {
  serviceId?: string;
  serviceName?: string;
  authenticationUrl?: string;
}

/**
 * Workspace definition
 */
export interface DocuSignWorkspace {
  workspaceId?: string;
  workspaceName?: string;
  status?: string;
  created?: string;
}

/**
 * Email archive entry
 */
export interface DocuSignEmailArchive {
  bccEmailArchiveId?: string;
  email?: string;
  created?: string;
  status?: string;
}

/**
 * Diagnostics settings
 */
export interface DocuSignDiagnosticsSettings {
  apiRequestLogging?: string;
  apiRequestLogMaxEntries?: string;
  apiRequestLogRemainingEntries?: string;
}

/**
 * Notary profile
 */
export interface DocuSignNotary {
  notaryId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  commissionNumber?: string;
  commissionExpiry?: string;
}

/**
 * Trust service seal provider
 */
export interface DocuSignSealProvider {
  sealIdentifier?: string;
  sealDisplayName?: string;
  signatureProviderName?: string;
}

/**
 * Template document
 */
export interface DocuSignTemplateDocument {
  documentId?: string;
  name?: string;
  fileExtension?: string;
  uri?: string;
}

/**
 * Template custom field
 */
export interface DocuSignTemplateCustomField {
  fieldId?: string;
  name?: string;
  value?: string;
  show?: string;
  required?: string;
}

/**
 * Template lock
 */
export interface DocuSignTemplateLock {
  lockToken?: string;
  lockType?: string;
  lockDurationInSeconds?: string;
  lockedByApp?: string;
  lockExpirationDateTime?: string;
}

/**
 * Account settings
 */
export interface DocuSignAccountSettings {
  accountSettings?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Account signature
 */
export interface DocuSignAccountSignature {
  signatureId?: string;
  signatureName?: string;
  signatureInitials?: string;
  imageType?: string;
  stampFormat?: string;
}

/**
 * Account watermark
 */
export interface DocuSignAccountWatermark {
  enabled?: string;
  watermarkText?: string;
  font?: string;
  fontSize?: string;
  fontColor?: string;
}

/**
 * Captive recipient
 */
export interface DocuSignCaptiveRecipient {
  clientUserId?: string;
  email?: string;
  userName?: string;
  errorDetails?: Record<string, string>;
}

/**
 * Consumer disclosure
 */
export interface DocuSignConsumerDisclosure {
  accountEsignId?: string;
  allowCDWithdraw?: string;
  companyName?: string;
  esignAgreement?: string;
}

/**
 * Notary journal entry
 */
export interface DocuSignNotaryJournal {
  journalId?: string;
  createdDate?: string;
  documentName?: string;
  signerName?: string;
  notarizationType?: string;
}

/**
 * Report
 */
export interface DocuSignReport {
  reportId?: string;
  reportType?: string;
  reportDateRangeType?: string;
}

/**
 * Template bulk recipient
 */
export interface DocuSignTemplateBulkRecipient {
  bulkRecipientRow?: string;
  email?: string;
  name?: string;
}
