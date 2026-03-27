import type { INodeProperties } from 'n8n-workflow';

/**
 * Notary Journal operations — manage notary journal entries
 */
export const notaryJournalOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['notaryJournal'],
    },
  },
  options: [
    {
      name: 'Get',
      value: 'get',
      action: 'Get notary journal entry',
    },
    {
      name: 'Get Many',
      value: 'getAll',
      action: 'Get many notary journal entries',
    },
  ],
  default: 'getAll',
};

/**
 * Notary Journal fields
 */
export const notaryJournalFields: INodeProperties[] = [
  {
    displayName: 'Journal ID',
    name: 'journalId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['notaryJournal'],
        operation: ['get'],
      },
    },
    default: '',
    description: 'The journal entry ID',
  },
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    displayOptions: {
      show: {
        resource: ['notaryJournal'],
        operation: ['getAll'],
      },
    },
    default: false,
    description: 'Whether to return all results',
  },
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    typeOptions: {
      minValue: 1,
      maxValue: 100,
    },
    displayOptions: {
      show: {
        resource: ['notaryJournal'],
        operation: ['getAll'],
        returnAll: [false],
      },
    },
    default: 50,
    description: 'Max results to return',
  },
];
