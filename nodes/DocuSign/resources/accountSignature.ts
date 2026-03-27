import type { INodeProperties } from 'n8n-workflow';

/**
 * Account Signature operations — manage account-level signatures
 */
export const accountSignatureOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['accountSignature'],
    },
  },
  options: [
    {
      name: 'Create',
      value: 'create',
      action: 'Create account signature',
      description: 'Create a new account signature',
    },
    {
      name: 'Delete',
      value: 'delete',
      action: 'Delete account signature',
      description: 'Delete an account signature',
    },
    {
      name: 'Get',
      value: 'get',
      action: 'Get account signature',
      description: 'Retrieve a specific account signature',
    },
    {
      name: 'Get Many',
      value: 'getAll',
      action: 'Get many account signatures',
      description: 'Retrieve all account signatures',
    },
    {
      name: 'Update',
      value: 'update',
      action: 'Update account signature',
      description: 'Update an existing account signature',
    },
  ],
  default: 'getAll',
};

/**
 * Account Signature fields
 */
export const accountSignatureFields: INodeProperties[] = [
  {
    displayName: 'Signature ID',
    name: 'signatureId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['accountSignature'],
        operation: ['get', 'update', 'delete'],
      },
    },
    default: '',
    description: 'The ID of the account signature',
  },
  {
    displayName: 'Signature Name',
    name: 'signatureName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['accountSignature'],
        operation: ['create'],
      },
    },
    default: '',
    description: 'The name for the new signature',
  },
  {
    displayName: 'Signature Initials',
    name: 'signatureInitials',
    type: 'string',
    displayOptions: {
      show: {
        resource: ['accountSignature'],
        operation: ['create'],
      },
    },
    default: '',
    description: 'Initials for the signature',
  },
  {
    displayName: 'Update Fields',
    name: 'updateFields',
    type: 'collection',
    placeholder: 'Add Field',
    displayOptions: {
      show: {
        resource: ['accountSignature'],
        operation: ['update'],
      },
    },
    default: {},
    options: [
      {
        displayName: 'Signature Name',
        name: 'signatureName',
        type: 'string',
        default: '',
        description: 'The updated name for the signature',
      },
      {
        displayName: 'Signature Initials',
        name: 'signatureInitials',
        type: 'string',
        default: '',
        description: 'The updated initials for the signature',
      },
    ],
  },
];
