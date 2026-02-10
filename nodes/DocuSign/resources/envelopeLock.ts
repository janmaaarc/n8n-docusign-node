import type { INodeProperties } from 'n8n-workflow';

/**
 * Envelope Lock operations available in the DocuSign node
 */
export const envelopeLockOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['envelopeLock'],
    },
  },
  options: [
    {
      name: 'Lock',
      value: 'create',
      action: 'Lock an envelope',
      description: 'Lock an envelope for safe editing',
    },
    {
      name: 'Get Lock',
      value: 'get',
      action: 'Get lock information',
      description: 'Get lock information for an envelope',
    },
    {
      name: 'Update Lock',
      value: 'update',
      action: 'Update an envelope lock',
      description: 'Update the duration or properties of an existing lock',
    },
    {
      name: 'Unlock',
      value: 'delete',
      action: 'Unlock an envelope',
      description: 'Remove lock from an envelope',
    },
  ],
  default: 'create',
};

/**
 * Envelope Lock fields for input parameters
 */
export const envelopeLockFields: INodeProperties[] = [
  // ==========================================================================
  // Shared Fields (all operations)
  // ==========================================================================
  {
    displayName: 'Envelope ID',
    name: 'envelopeId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelopeLock'],
        operation: ['create', 'get', 'update', 'delete'],
      },
    },
    default: '',
    description: 'The ID of the envelope to lock or unlock',
  },

  // ==========================================================================
  // Lock (Create) Operation Fields
  // ==========================================================================
  {
    displayName: 'Lock Duration (Seconds)',
    name: 'lockDurationInSeconds',
    type: 'number',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelopeLock'],
        operation: ['create'],
      },
    },
    typeOptions: {
      minValue: 1,
      maxValue: 1800,
    },
    default: 300,
    description: 'Duration of the lock in seconds (max 1800 = 30 minutes)',
  },
  {
    displayName: 'Locked By App',
    name: 'lockedByApp',
    type: 'string',
    displayOptions: {
      show: {
        resource: ['envelopeLock'],
        operation: ['create'],
      },
    },
    default: 'n8n',
    description: 'A friendly name of the application holding the lock',
  },

  // ==========================================================================
  // Update Lock Operation Fields
  // ==========================================================================
  {
    displayName: 'Lock Token',
    name: 'lockToken',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['envelopeLock'],
        operation: ['update', 'delete'],
      },
    },
    default: '',
    description: 'The lock token returned from the Lock operation. Required to update or unlock.',
  },
  {
    displayName: 'Lock Duration (Seconds)',
    name: 'lockDurationInSeconds',
    type: 'number',
    displayOptions: {
      show: {
        resource: ['envelopeLock'],
        operation: ['update'],
      },
    },
    typeOptions: {
      minValue: 1,
      maxValue: 1800,
    },
    default: 300,
    description: 'New duration of the lock in seconds',
  },
];
