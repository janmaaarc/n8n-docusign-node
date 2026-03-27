import type { INodeProperties } from 'n8n-workflow';

/**
 * Consumer Disclosure operations — manage consumer disclosure settings
 */
export const consumerDisclosureOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['consumerDisclosure'],
    },
  },
  options: [
    {
      name: 'Get',
      value: 'get',
      action: 'Get consumer disclosure for recipient',
      description: 'Get disclosure for a specific envelope recipient',
    },
    {
      name: 'Get Default',
      value: 'getDefault',
      action: 'Get default consumer disclosure',
      description: 'Get account-level default consumer disclosure',
    },
    {
      name: 'Update',
      value: 'update',
      action: 'Update consumer disclosure',
      description: 'Update account-level consumer disclosure',
    },
  ],
  default: 'getDefault',
};

/**
 * Consumer Disclosure fields
 */
export const consumerDisclosureFields: INodeProperties[] = [
  {
    displayName: 'Language Code',
    name: 'langCode',
    type: 'string',
    displayOptions: {
      show: {
        resource: ['consumerDisclosure'],
        operation: ['get', 'update'],
      },
    },
    default: 'en',
    description: 'Language code (e.g. en, fr, de)',
  },
  {
    displayName: 'Envelope ID',
    name: 'envelopeId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['consumerDisclosure'],
        operation: ['get'],
      },
    },
    default: '',
    description: 'The envelope ID',
  },
  {
    displayName: 'Recipient ID',
    name: 'recipientId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['consumerDisclosure'],
        operation: ['get'],
      },
    },
    default: '',
    description: 'The recipient ID within the envelope',
  },
  {
    displayName: 'ESIGN Agreement',
    name: 'esignAgreement',
    type: 'string',
    typeOptions: {
      rows: 4,
    },
    displayOptions: {
      show: {
        resource: ['consumerDisclosure'],
        operation: ['update'],
      },
    },
    default: '',
    description: 'The ESIGN agreement text',
  },
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    displayOptions: {
      show: {
        resource: ['consumerDisclosure'],
        operation: ['update'],
      },
    },
    default: '',
    description: 'Company name for the disclosure',
  },
];
