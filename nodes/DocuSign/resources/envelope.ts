import type { INodeProperties } from 'n8n-workflow';
import { ENVELOPE_STATUSES } from '../constants';

/**
 * Envelope operations available in the DocuSign node
 */
export const envelopeOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['envelope'],
    },
  },
  options: [
    {
      name: 'Create',
      value: 'create',
      action: 'Create an envelope',
      description: 'Create a new envelope with documents and recipients',
    },
    {
      name: 'Create From Template',
      value: 'createFromTemplate',
      action: 'Create from template',
      description: 'Create and send an envelope using a template',
    },
    {
      name: 'Get',
      value: 'get',
      action: 'Get an envelope',
      description: 'Get details of a specific envelope',
    },
    {
      name: 'Get Many',
      value: 'getAll',
      action: 'Get many envelopes',
      description: 'Get a list of envelopes',
    },
    {
      name: 'Send',
      value: 'send',
      action: 'Send an envelope',
      description: 'Send a draft envelope for signing',
    },
    {
      name: 'Void',
      value: 'void',
      action: 'Void an envelope',
      description: 'Void an envelope to cancel the signing process',
    },
    {
      name: 'Download Document',
      value: 'downloadDocument',
      action: 'Download document',
      description: 'Download a signed document from an envelope',
    },
    {
      name: 'Get Audit Events',
      value: 'getAuditEvents',
      action: 'Get audit events',
      description: 'Get the audit trail for an envelope',
    },
    {
      name: 'Get Recipients',
      value: 'getRecipients',
      action: 'Get recipients',
      description: 'Get the list of recipients for an envelope',
    },
    {
      name: 'Resend',
      value: 'resend',
      action: 'Resend an envelope',
      description: 'Resend notification emails to recipients',
    },
    {
      name: 'Update Recipients',
      value: 'updateRecipients',
      action: 'Update recipients',
      description: 'Update recipient email or name for an envelope',
    },
    {
      name: 'Delete',
      value: 'delete',
      action: 'Delete an envelope',
      description: 'Delete a draft envelope (only works for drafts)',
    },
    {
      name: 'Create Signing URL',
      value: 'createRecipientView',
      action: 'Create embedded signing URL',
      description: 'Generate a URL for embedded signing in your app',
    },
    {
      name: 'List Documents',
      value: 'listDocuments',
      action: 'List documents',
      description: 'Get the list of documents in an envelope',
    },
    {
      name: 'Correct',
      value: 'correct',
      action: 'Correct an envelope',
      description: 'Generate a correction URL for a sent envelope',
    },
  ],
  default: 'create',
};

/**
 * Envelope fields for input parameters
 */
export const envelopeFields: INodeProperties[] = [
  // ==========================================================================
  // Create Operation Fields
  // ==========================================================================
  {
    displayName: 'Email Subject',
    name: 'emailSubject',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['create'],
      },
    },
    default: '',
    placeholder: 'Please sign this document',
    description: 'Subject line of the email sent to recipients',
  },
  {
    displayName: 'Signer Email',
    name: 'signerEmail',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['create'],
      },
    },
    default: '',
    placeholder: 'signer@example.com',
    description: 'Email address of the person who needs to sign',
  },
  {
    displayName: 'Signer Name',
    name: 'signerName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['create'],
      },
    },
    default: '',
    placeholder: 'John Doe',
    description: 'Full name of the signer',
  },
  {
    displayName: 'Document',
    name: 'document',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['create'],
      },
    },
    default: '',
    description: 'Binary property name containing the document to send, or a base64-encoded string',
  },
  {
    displayName: 'Document Name',
    name: 'documentName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['create'],
      },
    },
    default: 'document.pdf',
    description: 'Name of the document file',
  },
  {
    displayName: 'Send Immediately',
    name: 'sendImmediately',
    type: 'boolean',
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['create'],
      },
    },
    default: true,
    description: 'Whether to send the envelope immediately after creation',
  },
  {
    displayName: 'Additional Options',
    name: 'additionalOptions',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['create'],
      },
    },
    options: [
      {
        displayName: 'Email Message',
        name: 'emailBlurb',
        type: 'string',
        default: '',
        description: 'Email body text sent to recipients',
        typeOptions: {
          rows: 3,
        },
      },
      {
        displayName: 'Allow Markup',
        name: 'allowMarkup',
        type: 'boolean',
        default: false,
        description: 'Whether to allow signers to mark up documents with comments and annotations',
      },
      {
        displayName: 'Allow Reassign',
        name: 'allowReassign',
        type: 'boolean',
        default: true,
        description: 'Whether to allow signers to reassign the envelope to another person',
      },
      {
        displayName: 'Brand ID',
        name: 'brandId',
        type: 'string',
        default: '',
        description: 'The ID of a brand to use for the envelope (for custom branding)',
      },
      {
        displayName: 'Enable Wet Sign',
        name: 'enableWetSign',
        type: 'boolean',
        default: false,
        description: 'Whether to allow signers to print and sign the document by hand',
      },
      {
        displayName: 'Enforce Signer Visibility',
        name: 'enforceSignerVisibility',
        type: 'boolean',
        default: false,
        description: 'Whether signers can only see fields assigned to them',
      },
      {
        displayName: 'Send Reminders',
        name: 'reminderEnabled',
        type: 'boolean',
        default: false,
        description: 'Whether to send automatic reminders to recipients',
      },
      {
        displayName: 'Reminder Delay (Days)',
        name: 'reminderDelay',
        type: 'number',
        default: 2,
        description: 'Number of days after sending before the first reminder',
        displayOptions: {
          show: {
            reminderEnabled: [true],
          },
        },
      },
      {
        displayName: 'Reminder Frequency (Days)',
        name: 'reminderFrequency',
        type: 'number',
        default: 1,
        description: 'Number of days between subsequent reminders',
        displayOptions: {
          show: {
            reminderEnabled: [true],
          },
        },
      },
      {
        displayName: 'Set Expiration',
        name: 'expireEnabled',
        type: 'boolean',
        default: false,
        description: 'Whether to set an expiration date on the envelope',
      },
      {
        displayName: 'Expire After (Days)',
        name: 'expireAfter',
        type: 'number',
        default: 120,
        description: 'Number of days until the envelope expires',
        displayOptions: {
          show: {
            expireEnabled: [true],
          },
        },
      },
      {
        displayName: 'Expiration Warning (Days)',
        name: 'expireWarn',
        type: 'number',
        default: 3,
        description: 'Number of days before expiration to warn recipients',
        displayOptions: {
          show: {
            expireEnabled: [true],
          },
        },
      },
      {
        displayName: 'Carbon Copy Email',
        name: 'ccEmail',
        type: 'string',
        default: '',
        description: 'Email address to send a copy to (will not sign)',
      },
      {
        displayName: 'Carbon Copy Name',
        name: 'ccName',
        type: 'string',
        default: '',
        description: 'Name of the carbon copy recipient',
      },
      {
        displayName: 'Signature Position X',
        name: 'signatureX',
        type: 'number',
        default: 100,
        description: 'X coordinate for signature field placement (in pixels)',
      },
      {
        displayName: 'Signature Position Y',
        name: 'signatureY',
        type: 'number',
        default: 100,
        description: 'Y coordinate for signature field placement (in pixels)',
      },
      {
        displayName: 'Signature Page',
        name: 'signaturePage',
        type: 'number',
        default: 1,
        description: 'Page number for signature field',
      },
      {
        displayName: 'Use Anchor Tag',
        name: 'useAnchor',
        type: 'boolean',
        default: false,
        description: 'Whether to use anchor text instead of coordinates for signature placement',
      },
      {
        displayName: 'Anchor String',
        name: 'anchorString',
        type: 'string',
        default: '/sig/',
        description: 'Text in document to anchor signature field to',
        displayOptions: {
          show: {
            useAnchor: [true],
          },
        },
      },
      {
        displayName: 'Additional Signers',
        name: 'additionalSigners',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        description: 'Add more signers to the envelope',
        options: [
          {
            name: 'signers',
            displayName: 'Signer',
            values: [
              {
                displayName: 'Email',
                name: 'email',
                type: 'string',
                default: '',
                required: true,
                description: 'Email address of the signer',
              },
              {
                displayName: 'Name',
                name: 'name',
                type: 'string',
                default: '',
                required: true,
                description: 'Full name of the signer',
              },
              {
                displayName: 'Routing Order',
                name: 'routingOrder',
                type: 'number',
                default: 2,
                description: 'Order in which this signer receives the envelope',
              },
            ],
          },
        ],
      },
      {
        displayName: 'Additional Documents',
        name: 'additionalDocuments',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        description: 'Add more documents to the envelope',
        options: [
          {
            name: 'documents',
            displayName: 'Document',
            values: [
              {
                displayName: 'Document',
                name: 'document',
                type: 'string',
                default: '',
                required: true,
                description: 'Binary property name or base64-encoded content',
              },
              {
                displayName: 'Document Name',
                name: 'documentName',
                type: 'string',
                default: '',
                required: true,
                description: 'Name of the document file',
              },
            ],
          },
        ],
      },
      {
        displayName: 'Custom Fields',
        name: 'customFields',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        description: 'Add custom metadata fields to the envelope',
        options: [
          {
            name: 'textFields',
            displayName: 'Text Field',
            values: [
              {
                displayName: 'Field ID',
                name: 'fieldId',
                type: 'string',
                default: '',
                required: true,
                description: 'Unique identifier for the custom field',
              },
              {
                displayName: 'Name',
                name: 'name',
                type: 'string',
                default: '',
                required: true,
                description: 'Name of the custom field',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
                description: 'Value for the custom field',
              },
              {
                displayName: 'Show In Email',
                name: 'show',
                type: 'boolean',
                default: false,
                description: 'Whether to show this field in email notifications',
              },
              {
                displayName: 'Required',
                name: 'required',
                type: 'boolean',
                default: false,
                description: 'Whether this field is required',
              },
            ],
          },
        ],
      },
      {
        displayName: 'Embedded Signing',
        name: 'embeddedSigning',
        type: 'boolean',
        default: false,
        description:
          'Whether to enable embedded signing (adds clientUserId to signer for later recipient view generation)',
      },
      {
        displayName: 'Client User ID',
        name: 'embeddedClientUserId',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            embeddedSigning: [true],
          },
        },
        description: 'A unique identifier for embedded signing. Required for createRecipientView.',
      },
      {
        displayName: 'Signer Authentication',
        name: 'signerAuthentication',
        type: 'fixedCollection',
        default: {},
        description: 'Add authentication requirements for the primary signer',
        options: [
          {
            name: 'auth',
            displayName: 'Authentication',
            values: [
              {
                displayName: 'Method',
                name: 'authMethod',
                type: 'options',
                options: [
                  { name: 'None', value: 'none', description: 'No additional authentication' },
                  {
                    name: 'Access Code',
                    value: 'accessCode',
                    description: 'Signer must enter a code to access the document',
                  },
                  {
                    name: 'Phone',
                    value: 'phone',
                    description: 'Signer must verify via phone call',
                  },
                  { name: 'SMS', value: 'sms', description: 'Signer must verify via SMS code' },
                ],
                default: 'none',
                description: 'Authentication method required before signing',
              },
              {
                displayName: 'Access Code',
                name: 'accessCode',
                type: 'string',
                typeOptions: {
                  password: true,
                },
                default: '',
                description: 'The code the signer must enter to access the document',
                displayOptions: {
                  show: {
                    authMethod: ['accessCode'],
                  },
                },
              },
              {
                displayName: 'Phone Number',
                name: 'phoneNumber',
                type: 'string',
                default: '',
                placeholder: '+1-555-123-4567',
                description: 'Phone number for verification',
                displayOptions: {
                  show: {
                    authMethod: ['phone', 'sms'],
                  },
                },
              },
            ],
          },
        ],
      },
      {
        displayName: 'Merge Fields',
        name: 'mergeFields',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        description:
          'Populate document placeholders with dynamic values. Put placeholders like {{FirstName}} in your document, then map them to values here.',
        options: [
          {
            name: 'fields',
            displayName: 'Field',
            values: [
              {
                displayName: 'Placeholder',
                name: 'placeholder',
                type: 'string',
                default: '',
                required: true,
                placeholder: '{{FirstName}}',
                description:
                  'The placeholder text in your document (e.g., {{FirstName}}, {{Company}})',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
                required: true,
                description: 'The value to populate in place of the placeholder',
              },
              {
                displayName: 'Font Size',
                name: 'fontSize',
                type: 'options',
                options: [
                  { name: 'Size 7', value: 'Size7' },
                  { name: 'Size 8', value: 'Size8' },
                  { name: 'Size 9', value: 'Size9' },
                  { name: 'Size 10', value: 'Size10' },
                  { name: 'Size 11', value: 'Size11' },
                  { name: 'Size 12 (Default)', value: 'Size12' },
                  { name: 'Size 14', value: 'Size14' },
                  { name: 'Size 16', value: 'Size16' },
                  { name: 'Size 18', value: 'Size18' },
                  { name: 'Size 20', value: 'Size20' },
                  { name: 'Size 22', value: 'Size22' },
                  { name: 'Size 24', value: 'Size24' },
                  { name: 'Size 26', value: 'Size26' },
                  { name: 'Size 28', value: 'Size28' },
                  { name: 'Size 36', value: 'Size36' },
                  { name: 'Size 48', value: 'Size48' },
                  { name: 'Size 72', value: 'Size72' },
                ],
                default: 'Size12',
                description: 'Font size for the populated text',
              },
            ],
          },
        ],
      },
      {
        displayName: 'Additional Tabs',
        name: 'additionalTabs',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        description: 'Add additional form fields (tabs) for the signer',
        options: [
          {
            name: 'tabs',
            displayName: 'Tab',
            values: [
              {
                displayName: 'Tab Type',
                name: 'tabType',
                type: 'options',
                options: [
                  { name: 'Initial Here', value: 'initialHereTabs', description: 'Initials field' },
                  {
                    name: 'Date Signed',
                    value: 'dateSignedTabs',
                    description: 'Auto-populated date field',
                  },
                  { name: 'Text Field', value: 'textTabs', description: 'Free-text input field' },
                  { name: 'Checkbox', value: 'checkboxTabs', description: 'Checkbox field' },
                  {
                    name: 'Full Name',
                    value: 'fullNameTabs',
                    description: 'Auto-filled full name',
                  },
                  { name: 'Email', value: 'emailTabs', description: 'Auto-filled email address' },
                  { name: 'Company', value: 'companyTabs', description: 'Company name field' },
                  { name: 'Title', value: 'titleTabs', description: 'Job title field' },
                  {
                    name: 'Radio Group',
                    value: 'radioGroupTabs',
                    description: 'Radio button group',
                  },
                  {
                    name: 'Dropdown/List',
                    value: 'listTabs',
                    description: 'Dropdown list selection',
                  },
                  { name: 'Number', value: 'numberTabs', description: 'Number input field' },
                  {
                    name: 'Formula',
                    value: 'formulaTabs',
                    description: 'Calculated formula field',
                  },
                  {
                    name: 'Signer Attachment',
                    value: 'signerAttachmentTabs',
                    description: 'Let signer upload an attachment',
                  },
                ],
                default: 'initialHereTabs',
                description: 'Type of form field to add',
              },
              {
                displayName: 'Document ID',
                name: 'documentId',
                type: 'string',
                default: '1',
                description: 'ID of the document to place this tab on',
              },
              {
                displayName: 'Page Number',
                name: 'pageNumber',
                type: 'number',
                default: 1,
                description: 'Page number for this tab',
              },
              {
                displayName: 'X Position',
                name: 'xPosition',
                type: 'number',
                default: 100,
                description: 'X coordinate for tab placement (pixels from left)',
              },
              {
                displayName: 'Y Position',
                name: 'yPosition',
                type: 'number',
                default: 150,
                description: 'Y coordinate for tab placement (pixels from top)',
              },
              {
                displayName: 'Tab Label',
                name: 'tabLabel',
                type: 'string',
                default: '',
                description: 'Label for the tab (used for identification)',
              },
              {
                displayName: 'Required',
                name: 'required',
                type: 'boolean',
                default: false,
                description: 'Whether this field is required',
              },
              {
                displayName: 'Radio Options',
                name: 'radioItems',
                type: 'string',
                default: '',
                placeholder: 'Yes,No,Maybe',
                description: 'Comma-separated radio button options',
                displayOptions: {
                  show: {
                    tabType: ['radioGroupTabs'],
                  },
                },
              },
              {
                displayName: 'Group Name',
                name: 'groupName',
                type: 'string',
                default: '',
                placeholder: 'myRadioGroup',
                description: 'Name for the radio button group (required)',
                displayOptions: {
                  show: {
                    tabType: ['radioGroupTabs'],
                  },
                },
              },
              {
                displayName: 'List Items',
                name: 'listItems',
                type: 'string',
                default: '',
                placeholder: 'Option A,Option B,Option C',
                description: 'Comma-separated list of dropdown options',
                displayOptions: {
                  show: {
                    tabType: ['listTabs'],
                  },
                },
              },
              {
                displayName: 'Formula',
                name: 'formula',
                type: 'string',
                default: '',
                placeholder: '[quantity] * [price]',
                description: 'Formula expression using tab labels in square brackets',
                displayOptions: {
                  show: {
                    tabType: ['formulaTabs'],
                  },
                },
              },
            ],
          },
        ],
      },
      {
        displayName: 'SMS Delivery',
        name: 'smsDelivery',
        type: 'fixedCollection',
        default: {},
        description:
          'Send signing notification via SMS in addition to email. Requires SMS delivery to be enabled in your DocuSign account.',
        options: [
          {
            name: 'sms',
            displayName: 'SMS Settings',
            values: [
              {
                displayName: 'Country Code',
                name: 'countryCode',
                type: 'string',
                default: '1',
                placeholder: '1',
                description:
                  'Numeric country code (e.g., 1 for US/Canada, 44 for UK). Do not include + symbol.',
              },
              {
                displayName: 'Phone Number',
                name: 'phoneNumber',
                type: 'string',
                default: '',
                required: true,
                placeholder: '5551234567',
                description:
                  'Phone number without country code. For US/Canada, omit leading 0 or 1.',
              },
            ],
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // Create From Template Fields
  // ==========================================================================
  {
    displayName: 'Template ID',
    name: 'templateId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['createFromTemplate'],
      },
    },
    default: '',
    description: 'The ID of the template to use',
  },
  {
    displayName: 'Email Subject',
    name: 'emailSubject',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['createFromTemplate'],
      },
    },
    default: '',
    placeholder: 'Please sign this document',
    description: 'Subject line of the email sent to recipients',
  },
  {
    displayName: 'Role Name',
    name: 'roleName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['createFromTemplate'],
      },
    },
    default: 'Signer',
    description: 'The role name defined in the template (e.g., "Signer", "Client")',
  },
  {
    displayName: 'Recipient Email',
    name: 'recipientEmail',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['createFromTemplate'],
      },
    },
    default: '',
    placeholder: 'recipient@example.com',
    description: 'Email address of the recipient',
  },
  {
    displayName: 'Recipient Name',
    name: 'recipientName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['createFromTemplate'],
      },
    },
    default: '',
    placeholder: 'John Doe',
    description: 'Full name of the recipient',
  },
  {
    displayName: 'Additional Options',
    name: 'additionalOptions',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['createFromTemplate'],
      },
    },
    options: [
      {
        displayName: 'Email Message',
        name: 'emailBlurb',
        type: 'string',
        default: '',
        description: 'Email body text sent to recipients',
        typeOptions: {
          rows: 3,
        },
      },
      {
        displayName: 'Merge Fields',
        name: 'mergeFields',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        description:
          'Populate document placeholders with dynamic values. Put placeholders like {{FirstName}} in your template document, then map them to values here.',
        options: [
          {
            name: 'fields',
            displayName: 'Field',
            values: [
              {
                displayName: 'Placeholder',
                name: 'placeholder',
                type: 'string',
                default: '',
                required: true,
                placeholder: '{{FirstName}}',
                description:
                  'The placeholder text in your document (e.g., {{FirstName}}, {{Company}})',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
                required: true,
                description: 'The value to populate in place of the placeholder',
              },
              {
                displayName: 'Font Size',
                name: 'fontSize',
                type: 'options',
                options: [
                  { name: 'Size 7', value: 'Size7' },
                  { name: 'Size 8', value: 'Size8' },
                  { name: 'Size 9', value: 'Size9' },
                  { name: 'Size 10', value: 'Size10' },
                  { name: 'Size 11', value: 'Size11' },
                  { name: 'Size 12 (Default)', value: 'Size12' },
                  { name: 'Size 14', value: 'Size14' },
                  { name: 'Size 16', value: 'Size16' },
                  { name: 'Size 18', value: 'Size18' },
                  { name: 'Size 20', value: 'Size20' },
                  { name: 'Size 22', value: 'Size22' },
                  { name: 'Size 24', value: 'Size24' },
                  { name: 'Size 26', value: 'Size26' },
                  { name: 'Size 28', value: 'Size28' },
                  { name: 'Size 36', value: 'Size36' },
                  { name: 'Size 48', value: 'Size48' },
                  { name: 'Size 72', value: 'Size72' },
                ],
                default: 'Size12',
                description: 'Font size for the populated text',
              },
            ],
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // Get Operation Fields
  // ==========================================================================
  {
    displayName: 'Envelope ID',
    name: 'envelopeId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: [
          'get',
          'send',
          'void',
          'downloadDocument',
          'resend',
          'getRecipients',
          'updateRecipients',
          'getAuditEvents',
          'delete',
          'createRecipientView',
          'listDocuments',
          'correct',
        ],
      },
    },
    default: '',
    description: 'The ID of the envelope',
  },

  // ==========================================================================
  // Get All Operation Fields
  // ==========================================================================
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['getAll'],
      },
    },
    default: false,
    description: 'Whether to return all results or only up to a given limit',
  },
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['getAll'],
        returnAll: [false],
      },
    },
    typeOptions: {
      minValue: 1,
      maxValue: 100,
    },
    default: 50,
    description: 'Max number of results to return',
  },
  {
    displayName: 'Filters',
    name: 'filters',
    type: 'collection',
    placeholder: 'Add Filter',
    default: {},
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['getAll'],
      },
    },
    options: [
      {
        displayName: 'Status',
        name: 'status',
        type: 'options',
        options: ENVELOPE_STATUSES.map((status) => ({
          name: status.name,
          value: status.value,
          description: status.description,
        })),
        default: '',
        description: 'Filter by envelope status',
      },
      {
        displayName: 'From Date',
        name: 'fromDate',
        type: 'dateTime',
        default: '',
        description: 'Start date for the date range filter',
      },
      {
        displayName: 'To Date',
        name: 'toDate',
        type: 'dateTime',
        default: '',
        description: 'End date for the date range filter',
      },
      {
        displayName: 'Search Text',
        name: 'searchText',
        type: 'string',
        default: '',
        description: 'Search for envelopes by text in subject or recipient',
      },
    ],
  },

  // ==========================================================================
  // Void Operation Fields
  // ==========================================================================
  {
    displayName: 'Void Reason',
    name: 'voidReason',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['void'],
      },
    },
    default: '',
    placeholder: 'Document no longer needed',
    description: 'Reason for voiding the envelope',
  },

  // ==========================================================================
  // Download Document Fields
  // ==========================================================================
  {
    displayName: 'Document ID',
    name: 'documentId',
    type: 'string',
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['downloadDocument'],
      },
    },
    default: 'combined',
    description:
      'ID of the document to download. Use "combined" for all documents, "certificate" for the certificate of completion, or a specific document ID.',
  },
  {
    displayName: 'Binary Property',
    name: 'binaryPropertyName',
    type: 'string',
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['downloadDocument'],
      },
    },
    default: 'data',
    description: 'Name of the binary property to store the downloaded document',
  },

  // ==========================================================================
  // Resend Operation Fields
  // ==========================================================================
  {
    displayName: 'Resend Reason',
    name: 'resendReason',
    type: 'string',
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['resend'],
      },
    },
    default: '',
    placeholder: 'Reminder to sign the document',
    description: 'Optional reason for resending (included in email)',
  },

  // ==========================================================================
  // Update Recipients Fields
  // ==========================================================================
  {
    displayName: 'Recipient ID',
    name: 'recipientId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['updateRecipients'],
      },
    },
    default: '',
    description: 'The ID of the recipient to update',
  },
  {
    displayName: 'Update Fields',
    name: 'updateFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['updateRecipients'],
      },
    },
    options: [
      {
        displayName: 'Email',
        name: 'email',
        type: 'string',
        default: '',
        description: 'New email address for the recipient',
      },
      {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        default: '',
        description: 'New name for the recipient',
      },
    ],
  },

  // ==========================================================================
  // Create Recipient View (Embedded Signing) Fields
  // ==========================================================================
  {
    displayName: 'Signer Email',
    name: 'signerEmail',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['createRecipientView'],
      },
    },
    default: '',
    placeholder: 'signer@example.com',
    description: 'Email address of the signer (must match a recipient in the envelope)',
  },
  {
    displayName: 'Signer Name',
    name: 'signerName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['createRecipientView'],
      },
    },
    default: '',
    placeholder: 'John Doe',
    description: 'Name of the signer (must match a recipient in the envelope)',
  },
  {
    displayName: 'Return URL',
    name: 'returnUrl',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['createRecipientView'],
      },
    },
    default: '',
    placeholder: 'https://yourapp.com/signing-complete',
    description: 'URL to redirect the signer to after signing is complete',
  },
  {
    displayName: 'Authentication Method',
    name: 'authenticationMethod',
    type: 'options',
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['createRecipientView'],
      },
    },
    options: [
      {
        name: 'None',
        value: 'None',
        description: 'No authentication required',
      },
      {
        name: 'Email',
        value: 'Email',
        description: 'Signer must verify email',
      },
      {
        name: 'Password',
        value: 'Password',
        description: 'Signer must enter a password',
      },
      {
        name: 'Phone',
        value: 'Phone',
        description: 'Signer must verify via phone',
      },
      {
        name: 'ID Check',
        value: 'IDCheck',
        description: 'Signer must pass ID verification',
      },
    ],
    default: 'None',
    description: 'Method used to authenticate the signer',
  },
  {
    displayName: 'Client User ID',
    name: 'clientUserId',
    type: 'string',
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['createRecipientView'],
      },
    },
    default: '',
    placeholder: 'user-123',
    description:
      'A unique identifier for this embedded signing session. If empty, generates one automatically.',
  },

  // ==========================================================================
  // Correct Operation Fields
  // ==========================================================================
  {
    displayName: 'Return URL',
    name: 'returnUrl',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelope'],
        operation: ['correct'],
      },
    },
    default: '',
    placeholder: 'https://yourapp.com/correction-complete',
    description: 'URL to redirect to after correction is complete',
  },
];
