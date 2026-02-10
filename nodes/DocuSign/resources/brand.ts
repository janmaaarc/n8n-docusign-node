import type { INodeProperties } from 'n8n-workflow';

/**
 * Brand Management operations available in the DocuSign node
 */
export const brandOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['brand'],
    },
  },
  options: [
    {
      name: 'Create',
      value: 'create',
      action: 'Create a brand',
      description: 'Create a new brand profile for your account',
    },
    {
      name: 'Delete',
      value: 'delete',
      action: 'Delete a brand',
      description: 'Delete a brand from your account',
    },
    {
      name: 'Get',
      value: 'get',
      action: 'Get a brand',
      description: 'Get details of a specific brand',
    },
    {
      name: 'Get Many',
      value: 'getAll',
      action: 'Get many brands',
      description: 'Get all brands in your account',
    },
    {
      name: 'Update',
      value: 'update',
      action: 'Update a brand',
      description: 'Update brand name and properties',
    },
  ],
  default: 'create',
};

/**
 * Brand Management fields for input parameters
 */
export const brandFields: INodeProperties[] = [
  // ==========================================================================
  // Create Operation Fields
  // ==========================================================================
  {
    displayName: 'Brand Name',
    name: 'brandName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['brand'],
        operation: ['create'],
      },
    },
    default: '',
    description: 'The name of the brand',
  },
  {
    displayName: 'Additional Options',
    name: 'additionalOptions',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        resource: ['brand'],
        operation: ['create'],
      },
    },
    options: [
      {
        displayName: 'Brand Company',
        name: 'brandCompany',
        type: 'string',
        default: '',
        description: 'The company name associated with the brand',
      },
      {
        displayName: 'Default Brand Language',
        name: 'defaultBrandLanguage',
        type: 'string',
        default: 'en',
        description: 'The default language for the brand (e.g., en, fr, de, es)',
      },
      {
        displayName: 'Override Company Name',
        name: 'isOverridingCompanyName',
        type: 'boolean',
        default: false,
        description: 'Whether the brand company name overrides the account company name',
      },
    ],
  },

  // ==========================================================================
  // Get / Delete Operation Fields
  // ==========================================================================
  {
    displayName: 'Brand ID',
    name: 'brandId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['brand'],
        operation: ['get', 'delete'],
      },
    },
    default: '',
    description: 'The ID of the brand',
  },

  // ==========================================================================
  // Update Operation Fields
  // ==========================================================================
  {
    displayName: 'Brand ID',
    name: 'brandId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['brand'],
        operation: ['update'],
      },
    },
    default: '',
    description: 'The ID of the brand to update',
  },
  {
    displayName: 'Update Fields',
    name: 'updateFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: {
      show: {
        resource: ['brand'],
        operation: ['update'],
      },
    },
    options: [
      {
        displayName: 'Brand Name',
        name: 'brandName',
        type: 'string',
        default: '',
        description: 'New name for the brand',
      },
      {
        displayName: 'Brand Company',
        name: 'brandCompany',
        type: 'string',
        default: '',
        description: 'New company name for the brand',
      },
      {
        displayName: 'Override Company Name',
        name: 'isOverridingCompanyName',
        type: 'boolean',
        default: false,
        description: 'Whether the brand company name overrides the account company name',
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
        resource: ['brand'],
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
        resource: ['brand'],
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
