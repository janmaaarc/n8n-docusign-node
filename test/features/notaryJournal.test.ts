import { describe, it, expect } from 'vitest';
import { createMockExecuteContext } from '../setup/mockContext';

describe('Notary Journal', () => {
  const getNode = async () => {
    const { DocuSign } = await import('../../nodes/DocuSign/DocuSign.node');
    return new DocuSign();
  };

  describe('get', () => {
    it('should get a notary journal entry', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'notaryJournal',
        operation: 'get',
        params: { journalId: 'j1' },
        apiResponse: { journalId: 'j1' },
      });
      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });

    it('should reject empty journalId', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'notaryJournal',
        operation: 'get',
        params: { journalId: '' },
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow();
    });
  });

  describe('getAll', () => {
    it('should get all notary journal entries', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'notaryJournal',
        operation: 'getAll',
        params: { returnAll: false, limit: 10 },
        apiResponse: { notaryJournals: [] },
      });
      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });
  });

  describe('unknown operation', () => {
    it('should throw for unknown operation', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'notaryJournal',
        operation: 'unknown',
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow('Unknown operation');
    });
  });
});
