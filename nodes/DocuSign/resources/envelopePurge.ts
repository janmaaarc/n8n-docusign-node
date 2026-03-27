import type { INodeProperties } from 'n8n-workflow';

/**
 * Envelope Purge operations — purge document content from completed envelopes
 */
export const envelopePurgeOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['envelopePurge'],
    },
  },
  options: [
    {
      name: 'Purge Documents',
      value: 'purgeDocuments',
      action: 'Purge envelope documents',
      description: 'Purge document content from a completed envelope',
    },
  ],
  default: 'purgeDocuments',
};

/**
 * Envelope Purge fields
 */
export const envelopePurgeFields: INodeProperties[] = [
  {
    displayName: 'Envelope ID',
    name: 'envelopeId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelopePurge'],
        operation: ['purgeDocuments'],
      },
    },
    default: '',
    description: 'The ID of the envelope to purge',
  },
  {
    displayName: 'Purge State',
    name: 'purgeState',
    type: 'options',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelopePurge'],
        operation: ['purgeDocuments'],
      },
    },
    options: [
      {
        name: 'Documents Purged',
        value: 'documents_purged',
      },
      {
        name: 'Documents and Metadata Purged',
        value: 'documents_and_metadata_purged',
      },
      {
        name: 'Documents and Metadata and Redact Purged',
        value: 'documents_and_metadata_and_redact_purged',
      },
    ],
    default: 'documents_purged',
    description: 'The level of purge to apply to the envelope',
  },
];
