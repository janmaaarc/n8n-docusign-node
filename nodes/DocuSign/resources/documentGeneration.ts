import type { INodeProperties } from 'n8n-workflow';

/**
 * Document Generation operations available in the DocuSign node
 */
export const documentGenerationOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['documentGeneration'],
    },
  },
  options: [
    {
      name: 'Get Form Fields',
      value: 'getFormFields',
      action: 'Get document generation form fields',
      description: 'Get the form fields available for document generation in a draft envelope',
    },
    {
      name: 'Update Form Fields',
      value: 'updateFormFields',
      action: 'Update document generation form fields',
      description: 'Populate form fields with dynamic data for document generation',
    },
  ],
  default: 'getFormFields',
};

/**
 * Document Generation fields for input parameters
 */
export const documentGenerationFields: INodeProperties[] = [
  // ==========================================================================
  // Shared Fields
  // ==========================================================================
  {
    displayName: 'Envelope ID',
    name: 'envelopeId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['documentGeneration'],
        operation: ['getFormFields', 'updateFormFields'],
      },
    },
    default: '',
    description: 'The ID of the draft envelope with DocGen-enabled documents',
  },

  // ==========================================================================
  // Update Form Fields Operation Fields
  // ==========================================================================
  {
    displayName: 'Document ID',
    name: 'documentId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['documentGeneration'],
        operation: ['updateFormFields'],
      },
    },
    default: '1',
    description: 'The ID of the document containing the form fields',
  },
  {
    displayName: 'Form Fields',
    name: 'formFields',
    type: 'fixedCollection',
    typeOptions: {
      multipleValues: true,
    },
    required: true,
    displayOptions: {
      show: {
        resource: ['documentGeneration'],
        operation: ['updateFormFields'],
      },
    },
    default: {},
    description: 'The form fields to populate with dynamic data',
    options: [
      {
        name: 'field',
        displayName: 'Field',
        values: [
          {
            displayName: 'Field Name',
            name: 'name',
            type: 'string',
            default: '',
            required: true,
            placeholder: 'FirstName',
            description: 'The name of the form field as defined in the Word template',
          },
          {
            displayName: 'Value',
            name: 'value',
            type: 'string',
            default: '',
            required: true,
            description: 'The value to populate in this field',
          },
        ],
      },
    ],
  },
];
