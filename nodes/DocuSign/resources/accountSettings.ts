import type { INodeProperties } from 'n8n-workflow';

/**
 * Account Settings operations — get and update account-level settings
 */
export const accountSettingsOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['accountSettings'],
    },
  },
  options: [
    {
      name: 'Get',
      value: 'get',
      action: 'Get account settings',
      description: 'Retrieve the current account settings',
    },
    {
      name: 'Update',
      value: 'update',
      action: 'Update account settings',
      description: 'Update one or more account settings',
    },
  ],
  default: 'get',
};

/**
 * Account Settings fields
 */
export const accountSettingsFields: INodeProperties[] = [
  {
    displayName: 'Settings JSON',
    name: 'settingsJson',
    type: 'string',
    required: true,
    typeOptions: {
      rows: 6,
    },
    displayOptions: {
      show: {
        resource: ['accountSettings'],
        operation: ['update'],
      },
    },
    default: '',
    placeholder: '{"enableSequentialSigningAPI": "true"}',
    description: 'JSON object of account settings to update',
  },
];
