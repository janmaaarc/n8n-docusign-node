import type { INodeProperties } from 'n8n-workflow';

/**
 * PowerForm operations available in the DocuSign node
 */
export const powerFormOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['powerForm'],
    },
  },
  options: [
    {
      name: 'Create',
      value: 'create',
      action: 'Create a PowerForm',
      description: 'Create a new PowerForm from a template',
    },
    {
      name: 'Delete',
      value: 'delete',
      action: 'Delete a PowerForm',
      description: 'Delete a PowerForm',
    },
    {
      name: 'Get',
      value: 'get',
      action: 'Get a PowerForm',
      description: 'Get details of a specific PowerForm',
    },
    {
      name: 'Get Many',
      value: 'getAll',
      action: 'Get many PowerForms',
      description: 'Get a list of PowerForms',
    },
  ],
  default: 'getAll',
};

/**
 * PowerForm fields for input parameters
 */
export const powerFormFields: INodeProperties[] = [
  // ==========================================================================
  // Create Operation Fields
  // ==========================================================================
  {
    displayName: 'Template ID',
    name: 'templateId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['powerForm'],
        operation: ['create'],
      },
    },
    default: '',
    description: 'The ID of the template to create the PowerForm from',
  },
  {
    displayName: 'Name',
    name: 'name',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['powerForm'],
        operation: ['create'],
      },
    },
    default: '',
    description: 'Name of the PowerForm',
  },
  {
    displayName: 'Additional Options',
    name: 'additionalOptions',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        resource: ['powerForm'],
        operation: ['create'],
      },
    },
    options: [
      {
        displayName: 'Email Subject',
        name: 'emailSubject',
        type: 'string',
        default: '',
        description: 'Email subject for PowerForm notifications',
      },
      {
        displayName: 'Email Body',
        name: 'emailBody',
        type: 'string',
        default: '',
        description: 'Email body text for PowerForm notifications',
        typeOptions: {
          rows: 3,
        },
      },
      {
        displayName: 'Signer Can Sign on Mobile',
        name: 'signerCanSignOnMobile',
        type: 'boolean',
        default: true,
        description: 'Whether signers can sign from mobile devices',
      },
      {
        displayName: 'Max Uses',
        name: 'maxUse',
        type: 'number',
        default: 0,
        description: 'Maximum number of times the PowerForm can be used (0 = unlimited)',
        typeOptions: {
          minValue: 0,
        },
      },
    ],
  },

  // ==========================================================================
  // Get / Delete Operation Fields
  // ==========================================================================
  {
    displayName: 'PowerForm ID',
    name: 'powerFormId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['powerForm'],
        operation: ['get', 'delete'],
      },
    },
    default: '',
    description: 'The ID of the PowerForm',
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
        resource: ['powerForm'],
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
        resource: ['powerForm'],
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
