import type { INodeProperties } from 'n8n-workflow';

/**
 * Template Bulk Recipient operations — manage bulk recipients for templates
 */
export const templateBulkRecipientOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['templateBulkRecipient'],
    },
  },
  options: [
    {
      name: 'Delete',
      value: 'delete',
      action: 'Delete bulk recipients',
      description: 'Delete bulk recipients from a template',
    },
    {
      name: 'Get',
      value: 'get',
      action: 'Get bulk recipients',
      description: 'Get bulk recipient list for a template',
    },
    {
      name: 'Upload',
      value: 'upload',
      action: 'Upload bulk recipients CSV',
      description: 'Upload a CSV file of bulk recipients for a template',
    },
  ],
  default: 'get',
};

/**
 * Template Bulk Recipient fields
 */
export const templateBulkRecipientFields: INodeProperties[] = [
  {
    displayName: 'Template ID',
    name: 'templateId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['templateBulkRecipient'],
        operation: ['upload', 'get', 'delete'],
      },
    },
    default: '',
    description: 'The template ID',
  },
  {
    displayName: 'Recipient ID',
    name: 'recipientId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['templateBulkRecipient'],
        operation: ['upload', 'get', 'delete'],
      },
    },
    default: '',
    description: 'The recipient ID (role) in the template',
  },
  {
    displayName: 'CSV Content',
    name: 'csvContent',
    type: 'string',
    typeOptions: {
      rows: 6,
    },
    required: true,
    placeholder: 'Name,Email\nJohn Doe,john@example.com',
    displayOptions: {
      show: {
        resource: ['templateBulkRecipient'],
        operation: ['upload'],
      },
    },
    default: '',
    description: 'CSV content with bulk recipient data (Name, Email, etc.)',
  },
];
