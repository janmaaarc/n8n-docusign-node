import type { INodeProperties } from 'n8n-workflow';

/**
 * Template operations available in the DocuSign node
 */
export const templateOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['template'],
    },
  },
  options: [
    {
      name: 'Create',
      value: 'create',
      action: 'Create a template',
      description: 'Create a new template with documents and roles',
    },
    {
      name: 'Delete',
      value: 'delete',
      action: 'Delete a template',
      description: 'Delete a template',
    },
    {
      name: 'Get',
      value: 'get',
      action: 'Get a template',
      description: 'Get details of a specific template',
    },
    {
      name: 'Get Many',
      value: 'getAll',
      action: 'Get many templates',
      description: 'Get a list of templates',
    },
    {
      name: 'Update',
      value: 'update',
      action: 'Update a template',
      description: 'Update an existing template',
    },
  ],
  default: 'getAll',
};

/**
 * Template fields for input parameters
 */
export const templateFields: INodeProperties[] = [
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
        resource: ['template'],
        operation: ['create'],
      },
    },
    default: '',
    description: 'Default email subject for envelopes created from this template',
  },
  {
    displayName: 'Document',
    name: 'document',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['template'],
        operation: ['create'],
      },
    },
    default: '',
    description: 'Binary property name containing the document, or a base64-encoded string',
  },
  {
    displayName: 'Document Name',
    name: 'documentName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['template'],
        operation: ['create'],
      },
    },
    default: '',
    placeholder: 'contract.pdf',
    description: 'File name for the document (e.g., contract.pdf)',
  },
  {
    displayName: 'Description',
    name: 'description',
    type: 'string',
    displayOptions: {
      show: {
        resource: ['template'],
        operation: ['create'],
      },
    },
    default: '',
    description: 'Template description',
  },
  {
    displayName: 'Additional Options',
    name: 'additionalOptions',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        resource: ['template'],
        operation: ['create'],
      },
    },
    options: [
      {
        displayName: 'Email Message',
        name: 'emailBlurb',
        type: 'string',
        default: '',
        description: 'Default email body text for envelopes created from this template',
        typeOptions: {
          rows: 3,
        },
      },
      {
        displayName: 'Role Name',
        name: 'roleName',
        type: 'string',
        default: 'Signer',
        description: 'Default signer role name for the template',
      },
    ],
  },

  // ==========================================================================
  // Get / Update / Delete Operation Fields
  // ==========================================================================
  {
    displayName: 'Template ID',
    name: 'templateId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['template'],
        operation: ['get', 'update', 'delete'],
      },
    },
    default: '',
    description: 'The ID of the template',
  },

  // ==========================================================================
  // Update Operation Fields
  // ==========================================================================
  {
    displayName: 'Update Fields',
    name: 'updateFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: {
      show: {
        resource: ['template'],
        operation: ['update'],
      },
    },
    options: [
      {
        displayName: 'Email Subject',
        name: 'emailSubject',
        type: 'string',
        default: '',
        description: 'Default email subject for envelopes created from this template',
      },
      {
        displayName: 'Description',
        name: 'description',
        type: 'string',
        default: '',
        description: 'Template description',
      },
      {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        default: '',
        description: 'Template name',
      },
    ],
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
        resource: ['template'],
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
        resource: ['template'],
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
        resource: ['template'],
        operation: ['getAll'],
      },
    },
    options: [
      {
        displayName: 'Search Text',
        name: 'searchText',
        type: 'string',
        default: '',
        description: 'Search for templates by name',
      },
      {
        displayName: 'Folder ID',
        name: 'folderId',
        type: 'string',
        default: '',
        description: 'Filter by folder ID',
      },
      {
        displayName: 'Shared By Me',
        name: 'sharedByMe',
        type: 'boolean',
        default: false,
        description: 'Whether to only return templates shared by the current user',
      },
    ],
  },
];
