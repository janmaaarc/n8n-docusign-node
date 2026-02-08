import type { INodeProperties } from 'n8n-workflow';

/**
 * Bulk Send operations available in the DocuSign node
 */
export const bulkSendOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['bulkSend'],
    },
  },
  options: [
    {
      name: 'Create List',
      value: 'createList',
      action: 'Create a bulk send list',
      description: 'Create a new bulk send list with recipients',
    },
    {
      name: 'Delete List',
      value: 'deleteList',
      action: 'Delete a bulk send list',
      description: 'Delete a bulk send list',
    },
    {
      name: 'Get Batch Status',
      value: 'getBatchStatus',
      action: 'Get batch status',
      description: 'Get the status of a bulk send batch',
    },
    {
      name: 'Get List',
      value: 'get',
      action: 'Get a bulk send list',
      description: 'Get details of a bulk send list',
    },
    {
      name: 'Get Many Lists',
      value: 'getAll',
      action: 'Get many bulk send lists',
      description: 'Get all bulk send lists',
    },
    {
      name: 'Send',
      value: 'send',
      action: 'Send bulk envelopes',
      description: 'Send bulk envelopes using a list and template or envelope',
    },
  ],
  default: 'createList',
};

/**
 * Bulk Send fields for input parameters
 */
export const bulkSendFields: INodeProperties[] = [
  // ==========================================================================
  // Create List Operation Fields
  // ==========================================================================
  {
    displayName: 'List Name',
    name: 'listName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['bulkSend'],
        operation: ['createList'],
      },
    },
    default: '',
    description: 'Name of the bulk send list',
  },
  {
    displayName: 'Recipients',
    name: 'recipients',
    type: 'fixedCollection',
    typeOptions: {
      multipleValues: true,
    },
    required: true,
    displayOptions: {
      show: {
        resource: ['bulkSend'],
        operation: ['createList'],
      },
    },
    default: {},
    description: 'Recipients to include in the bulk send list',
    options: [
      {
        name: 'recipient',
        displayName: 'Recipient',
        values: [
          {
            displayName: 'Email',
            name: 'email',
            type: 'string',
            default: '',
            required: true,
            placeholder: 'recipient@example.com',
            description: 'Recipient email address',
          },
          {
            displayName: 'Name',
            name: 'name',
            type: 'string',
            default: '',
            required: true,
            placeholder: 'John Doe',
            description: 'Recipient full name',
          },
          {
            displayName: 'Role Name',
            name: 'roleName',
            type: 'string',
            default: 'Signer',
            description: 'The template role name for this recipient',
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // Get / Delete List Operation Fields
  // ==========================================================================
  {
    displayName: 'List ID',
    name: 'listId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['bulkSend'],
        operation: ['get', 'deleteList', 'send', 'getBatchStatus'],
      },
    },
    default: '',
    description: 'The ID of the bulk send list',
  },

  // ==========================================================================
  // Send Operation Fields
  // ==========================================================================
  {
    displayName: 'Envelope or Template ID',
    name: 'envelopeOrTemplateId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['bulkSend'],
        operation: ['send'],
      },
    },
    default: '',
    description: 'The ID of the envelope or template to use for bulk sending',
  },

  // ==========================================================================
  // Get Batch Status Operation Fields
  // ==========================================================================
  {
    displayName: 'Batch ID',
    name: 'batchId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['bulkSend'],
        operation: ['getBatchStatus'],
      },
    },
    default: '',
    description: 'The ID of the bulk send batch',
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
        resource: ['bulkSend'],
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
        resource: ['bulkSend'],
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
];
