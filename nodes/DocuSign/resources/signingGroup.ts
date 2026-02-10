import type { INodeProperties } from 'n8n-workflow';

/**
 * Signing Group operations available in the DocuSign node
 */
export const signingGroupOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['signingGroup'],
    },
  },
  options: [
    {
      name: 'Create',
      value: 'create',
      action: 'Create a signing group',
      description: 'Create a signing group where any member can sign on behalf of the group',
    },
    {
      name: 'Delete',
      value: 'delete',
      action: 'Delete a signing group',
      description: 'Delete a signing group',
    },
    {
      name: 'Get',
      value: 'get',
      action: 'Get a signing group',
      description: 'Get details of a signing group',
    },
    {
      name: 'Get Many',
      value: 'getAll',
      action: 'Get many signing groups',
      description: 'Get all signing groups',
    },
    {
      name: 'Update',
      value: 'update',
      action: 'Update a signing group',
      description: 'Update a signing group name or members',
    },
  ],
  default: 'create',
};

/**
 * Signing Group fields for input parameters
 */
export const signingGroupFields: INodeProperties[] = [
  // ==========================================================================
  // Create Operation Fields
  // ==========================================================================
  {
    displayName: 'Group Name',
    name: 'groupName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['signingGroup'],
        operation: ['create'],
      },
    },
    default: '',
    description: 'Name of the signing group',
  },
  {
    displayName: 'Members',
    name: 'members',
    type: 'fixedCollection',
    typeOptions: {
      multipleValues: true,
    },
    required: true,
    displayOptions: {
      show: {
        resource: ['signingGroup'],
        operation: ['create'],
      },
    },
    default: {},
    description: 'Members of the signing group. Any member can sign on behalf of the group.',
    options: [
      {
        name: 'member',
        displayName: 'Member',
        values: [
          {
            displayName: 'Email',
            name: 'email',
            type: 'string',
            default: '',
            required: true,
            placeholder: 'member@example.com',
            description: 'Member email address',
          },
          {
            displayName: 'Name',
            name: 'name',
            type: 'string',
            default: '',
            required: true,
            placeholder: 'John Doe',
            description: 'Member full name',
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // Get / Delete Operation Fields
  // ==========================================================================
  {
    displayName: 'Signing Group ID',
    name: 'signingGroupId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['signingGroup'],
        operation: ['get', 'delete'],
      },
    },
    default: '',
    description: 'The ID of the signing group',
  },

  // ==========================================================================
  // Update Operation Fields
  // ==========================================================================
  {
    displayName: 'Signing Group ID',
    name: 'signingGroupId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['signingGroup'],
        operation: ['update'],
      },
    },
    default: '',
    description: 'The ID of the signing group to update',
  },
  {
    displayName: 'Update Fields',
    name: 'updateFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: {
      show: {
        resource: ['signingGroup'],
        operation: ['update'],
      },
    },
    options: [
      {
        displayName: 'Group Name',
        name: 'groupName',
        type: 'string',
        default: '',
        description: 'New name for the signing group',
      },
      {
        displayName: 'Members',
        name: 'members',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        description: 'Updated list of members for the signing group',
        options: [
          {
            name: 'member',
            displayName: 'Member',
            values: [
              {
                displayName: 'Email',
                name: 'email',
                type: 'string',
                default: '',
                required: true,
                placeholder: 'member@example.com',
                description: 'Member email address',
              },
              {
                displayName: 'Name',
                name: 'name',
                type: 'string',
                default: '',
                required: true,
                placeholder: 'John Doe',
                description: 'Member full name',
              },
            ],
          },
        ],
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
        resource: ['signingGroup'],
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
        resource: ['signingGroup'],
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
