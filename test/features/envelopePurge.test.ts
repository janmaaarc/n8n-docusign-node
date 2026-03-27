import { describe, it, expect } from 'vitest';
import { createMockExecuteContext } from '../setup/mockContext';
import { VALID_UUID } from '../setup/constants';

describe('Envelope Purge', () => {
  const getNode = async () => {
    const { DocuSign } = await import('../../nodes/DocuSign/DocuSign.node');
    return new DocuSign();
  };

  describe('purgeDocuments', () => {
    it('should purge documents successfully', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'envelopePurge',
        operation: 'purgeDocuments',
        params: {
          envelopeId: VALID_UUID,
          purgeState: 'documents_purged',
        },
        apiResponse: { purgeState: 'documents_purged' },
      });
      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });

    it('should reject invalid UUID', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'envelopePurge',
        operation: 'purgeDocuments',
        params: {
          envelopeId: 'bad',
          purgeState: 'documents_purged',
        },
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow();
    });

    it('should reject empty purgeState', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'envelopePurge',
        operation: 'purgeDocuments',
        params: {
          envelopeId: VALID_UUID,
          purgeState: '',
        },
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow();
    });
  });

  describe('unknown operation', () => {
    it('should throw for unknown operation', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'envelopePurge',
        operation: 'unknown',
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow('Unknown operation');
    });
  });
});
