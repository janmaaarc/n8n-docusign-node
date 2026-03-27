import type { INodeProperties } from 'n8n-workflow';

/**
 * Account Watermark operations — manage account watermark settings
 */
export const accountWatermarkOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['accountWatermark'],
    },
  },
  options: [
    {
      name: 'Get',
      value: 'get',
      action: 'Get account watermark',
    },
    {
      name: 'Preview',
      value: 'preview',
      action: 'Preview account watermark',
      description: 'Preview watermark without saving',
    },
    {
      name: 'Update',
      value: 'update',
      action: 'Update account watermark',
    },
  ],
  default: 'get',
};

/**
 * Account Watermark fields
 */
export const accountWatermarkFields: INodeProperties[] = [
  {
    displayName: 'Enabled',
    name: 'enabled',
    type: 'boolean',
    displayOptions: {
      show: {
        resource: ['accountWatermark'],
        operation: ['update', 'preview'],
      },
    },
    default: true,
    description: 'Whether watermark is enabled',
  },
  {
    displayName: 'Watermark Text',
    name: 'watermarkText',
    type: 'string',
    displayOptions: {
      show: {
        resource: ['accountWatermark'],
        operation: ['update', 'preview'],
      },
    },
    default: 'DRAFT',
    description: 'Text displayed as watermark',
  },
  {
    displayName: 'Font',
    name: 'font',
    type: 'string',
    displayOptions: {
      show: {
        resource: ['accountWatermark'],
        operation: ['update', 'preview'],
      },
    },
    default: 'Arial',
    description: 'Font name for watermark text',
  },
  {
    displayName: 'Font Size',
    name: 'fontSize',
    type: 'string',
    displayOptions: {
      show: {
        resource: ['accountWatermark'],
        operation: ['update', 'preview'],
      },
    },
    default: '48',
    description: 'Font size for watermark text',
  },
  {
    displayName: 'Font Color',
    name: 'fontColor',
    type: 'string',
    displayOptions: {
      show: {
        resource: ['accountWatermark'],
        operation: ['update', 'preview'],
      },
    },
    default: '#999999',
    description: 'Hex color for watermark text',
  },
];
