import type { INodeProperties } from 'n8n-workflow';

/**
 * Template View operations — generate URLs for template editing in the DocuSign UI
 */
export const templateViewOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['templateView'],
    },
  },
  options: [
    {
      name: 'Create Edit View',
      value: 'createEditView',
      action: 'Create template edit view',
      description: 'Generate a URL for editing a template in the DocuSign UI',
    },
  ],
  default: 'createEditView',
};

/**
 * Template View fields
 */
export const templateViewFields: INodeProperties[] = [
  {
    displayName: 'Template ID',
    name: 'templateId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['templateView'],
        operation: ['createEditView'],
      },
    },
    default: '',
    description: 'The ID of the template to edit',
  },
  {
    displayName: 'Return URL',
    name: 'returnUrl',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['templateView'],
        operation: ['createEditView'],
      },
    },
    default: '',
    placeholder: 'https://yourapp.com/callback',
    description: 'URL to redirect to after editing',
  },
];
