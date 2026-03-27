import type { INodeProperties } from 'n8n-workflow';

/**
 * Captive Recipient operations — manage embedded (captive) recipients
 */
export const captiveRecipientOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['captiveRecipient'],
    },
  },
  options: [
    {
      name: 'Create',
      value: 'create',
      action: 'Create captive recipient',
      description: 'Register an embedded (captive) recipient',
    },
    {
      name: 'Delete',
      value: 'delete',
      action: 'Delete captive recipients',
      description: 'Delete captive recipient signatures',
    },
  ],
  default: 'create',
};

/**
 * Captive Recipient fields
 */
export const captiveRecipientFields: INodeProperties[] = [
  {
    displayName: 'Signer Email',
    name: 'signerEmail',
    type: 'string',
    placeholder: 'name@email.com',
    required: true,
    displayOptions: {
      show: {
        resource: ['captiveRecipient'],
        operation: ['create', 'delete'],
      },
    },
    default: '',
    description: 'Email address of the signer',
  },
  {
    displayName: 'Signer Name',
    name: 'signerName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['captiveRecipient'],
        operation: ['create'],
      },
    },
    default: '',
    description: 'Full name of the signer',
  },
  {
    displayName: 'Client User ID',
    name: 'clientUserId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['captiveRecipient'],
        operation: ['create'],
      },
    },
    default: '',
    description: 'Unique ID for the embedded signer',
  },
];
