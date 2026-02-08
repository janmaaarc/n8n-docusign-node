import type { INodeProperties } from 'n8n-workflow';
import { bulkSendOperations, bulkSendFields } from './bulkSend';
import { envelopeOperations, envelopeFields } from './envelope';
import { folderOperations, folderFields } from './folder';
import { powerFormOperations, powerFormFields } from './powerForm';
import { templateOperations, templateFields } from './template';

/**
 * Resource selector for the DocuSign node
 */
export const resourceProperty: INodeProperties = {
  displayName: 'Resource',
  name: 'resource',
  type: 'options',
  noDataExpression: true,
  options: [
    {
      name: 'Bulk Send',
      value: 'bulkSend',
      description: 'Create bulk send lists and send envelopes in bulk',
    },
    {
      name: 'Envelope',
      value: 'envelope',
      description: 'Create, send, and manage signature envelopes',
    },
    {
      name: 'Folder',
      value: 'folder',
      description: 'List folders and move envelopes between folders',
    },
    {
      name: 'PowerForm',
      value: 'powerForm',
      description: 'Create and manage self-service signing forms',
    },
    {
      name: 'Template',
      value: 'template',
      description: 'Create, update, delete, and use envelope templates',
    },
  ],
  default: 'envelope',
};

/**
 * All operations for the DocuSign node
 */
export const allOperations: INodeProperties[] = [
  bulkSendOperations,
  envelopeOperations,
  folderOperations,
  powerFormOperations,
  templateOperations,
];

/**
 * All fields for the DocuSign node
 */
export const allFields: INodeProperties[] = [
  ...bulkSendFields,
  ...envelopeFields,
  ...folderFields,
  ...powerFormFields,
  ...templateFields,
];
