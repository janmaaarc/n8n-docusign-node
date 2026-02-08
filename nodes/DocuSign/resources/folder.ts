import type { INodeProperties } from 'n8n-workflow';
import { SEARCH_FOLDER_IDS, ENVELOPE_STATUSES } from '../constants';

/**
 * Folder operations available in the DocuSign node
 */
export const folderOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['folder'],
    },
  },
  options: [
    {
      name: 'Get Many',
      value: 'getAll',
      action: 'Get many folders',
      description: 'List all folders in the account',
    },
    {
      name: 'Get Items',
      value: 'getItems',
      action: 'Get folder items',
      description: 'Get envelopes in a specific folder',
    },
    {
      name: 'Move Envelope',
      value: 'moveEnvelope',
      action: 'Move envelope to folder',
      description: 'Move envelopes to a specific folder',
    },
    {
      name: 'Search',
      value: 'search',
      action: 'Search folders',
      description: 'Search for envelopes across folders',
    },
  ],
  default: 'getAll',
};

/**
 * Folder fields for input parameters
 */
export const folderFields: INodeProperties[] = [
  // ==========================================================================
  // Get Items Operation Fields
  // ==========================================================================
  {
    displayName: 'Folder ID',
    name: 'folderId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['folder'],
        operation: ['getItems', 'moveEnvelope'],
      },
    },
    default: '',
    description: 'The ID of the folder',
  },
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    displayOptions: {
      show: {
        resource: ['folder'],
        operation: ['getItems'],
      },
    },
    default: false,
    description: 'Whether to return all results or only up to a given limit',
  },
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    displayOptions: {
      show: {
        resource: ['folder'],
        operation: ['getItems'],
        returnAll: [false],
      },
    },
    typeOptions: {
      minValue: 1,
      maxValue: 100,
    },
    default: 50,
    description: 'Max number of results to return',
  },

  // ==========================================================================
  // Move Envelope Operation Fields
  // ==========================================================================
  {
    displayName: 'Envelope IDs',
    name: 'envelopeIds',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['folder'],
        operation: ['moveEnvelope'],
      },
    },
    default: '',
    placeholder: 'abc123-..., def456-...',
    description: 'Comma-separated envelope IDs to move into the folder',
  },

  // ==========================================================================
  // Search Operation Fields
  // ==========================================================================
  {
    displayName: 'Search Folder',
    name: 'searchFolderId',
    type: 'options',
    required: true,
    displayOptions: {
      show: {
        resource: ['folder'],
        operation: ['search'],
      },
    },
    options: SEARCH_FOLDER_IDS,
    default: 'drafts',
    description: 'The system folder to search in',
  },
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    displayOptions: {
      show: {
        resource: ['folder'],
        operation: ['search'],
      },
    },
    default: false,
    description: 'Whether to return all results or only up to a given limit',
  },
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    displayOptions: {
      show: {
        resource: ['folder'],
        operation: ['search'],
        returnAll: [false],
      },
    },
    typeOptions: {
      minValue: 1,
      maxValue: 100,
    },
    default: 50,
    description: 'Max number of results to return',
  },
  {
    displayName: 'Filters',
    name: 'filters',
    type: 'collection',
    placeholder: 'Add Filter',
    default: {},
    displayOptions: {
      show: {
        resource: ['folder'],
        operation: ['search'],
      },
    },
    options: [
      {
        displayName: 'Search Text',
        name: 'searchText',
        type: 'string',
        default: '',
        description: 'Search for envelopes by text',
      },
      {
        displayName: 'From Date',
        name: 'fromDate',
        type: 'string',
        default: '',
        placeholder: '2025-01-01T00:00:00Z',
        description: 'Start date filter (ISO 8601 format)',
      },
      {
        displayName: 'To Date',
        name: 'toDate',
        type: 'string',
        default: '',
        placeholder: '2025-12-31T23:59:59Z',
        description: 'End date filter (ISO 8601 format)',
      },
      {
        displayName: 'Status',
        name: 'status',
        type: 'options',
        options: ENVELOPE_STATUSES,
        default: 'completed',
        description: 'Filter by envelope status',
      },
    ],
  },
];
