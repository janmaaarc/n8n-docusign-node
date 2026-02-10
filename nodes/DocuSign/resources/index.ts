import type { INodeProperties } from 'n8n-workflow';
import { brandOperations, brandFields } from './brand';
import { bulkSendOperations, bulkSendFields } from './bulkSend';
import { documentGenerationOperations, documentGenerationFields } from './documentGeneration';
import { envelopeOperations, envelopeFields } from './envelope';
import { envelopeLockOperations, envelopeLockFields } from './envelopeLock';
import { folderOperations, folderFields } from './folder';
import { powerFormOperations, powerFormFields } from './powerForm';
import { signingGroupOperations, signingGroupFields } from './signingGroup';
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
      name: 'Brand',
      value: 'brand',
      description: 'Create, get, update, and delete account branding',
    },
    {
      name: 'Bulk Send',
      value: 'bulkSend',
      description: 'Create bulk send lists and send envelopes in bulk',
    },
    {
      name: 'Document Generation',
      value: 'documentGeneration',
      description: 'Generate documents from templates with dynamic data fields',
    },
    {
      name: 'Envelope',
      value: 'envelope',
      description: 'Create, send, and manage signature envelopes',
    },
    {
      name: 'Envelope Lock',
      value: 'envelopeLock',
      description: 'Lock and unlock envelopes for safe editing',
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
      name: 'Signing Group',
      value: 'signingGroup',
      description: 'Manage groups where any member can sign on behalf of the group',
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
  brandOperations,
  bulkSendOperations,
  documentGenerationOperations,
  envelopeOperations,
  envelopeLockOperations,
  folderOperations,
  powerFormOperations,
  signingGroupOperations,
  templateOperations,
];

/**
 * All fields for the DocuSign node
 */
export const allFields: INodeProperties[] = [
  ...brandFields,
  ...bulkSendFields,
  ...documentGenerationFields,
  ...envelopeFields,
  ...envelopeLockFields,
  ...folderFields,
  ...powerFormFields,
  ...signingGroupFields,
  ...templateFields,
];
