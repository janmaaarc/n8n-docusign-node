import type { INodeProperties } from 'n8n-workflow';

/**
 * Reporting operations — access account reports and permission profiles
 */
export const reportingOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['reporting'],
    },
  },
  options: [
    {
      name: 'Get Product Permission Profiles',
      value: 'getProductPermissionProfiles',
      action: 'Get product permission profiles',
      description: 'Retrieve product permission profiles for the account',
    },
    {
      name: 'Get Report in Account',
      value: 'getReportInAccount',
      action: 'Get account report',
      description: 'Retrieve a report for the account',
    },
  ],
  default: 'getReportInAccount',
};

/**
 * Reporting fields
 */
export const reportingFields: INodeProperties[] = [
  {
    displayName: 'Start Date',
    name: 'startDate',
    type: 'dateTime',
    displayOptions: {
      show: {
        resource: ['reporting'],
        operation: ['getReportInAccount'],
      },
    },
    default: '',
    description: 'Start date in ISO 8601 format',
  },
  {
    displayName: 'End Date',
    name: 'endDate',
    type: 'dateTime',
    displayOptions: {
      show: {
        resource: ['reporting'],
        operation: ['getReportInAccount'],
      },
    },
    default: '',
    description: 'End date in ISO 8601 format',
  },
];
