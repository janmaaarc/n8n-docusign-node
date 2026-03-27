import { describe, it, expect } from 'vitest';
import { createMockExecuteContext } from '../setup/mockContext';

describe('Account Settings', () => {
  const getNode = async () => {
    const { DocuSign } = await import('../../nodes/DocuSign/DocuSign.node');
    return new DocuSign();
  };

  describe('get', () => {
    it('should get account settings successfully', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'accountSettings',
        operation: 'get',
        params: {},
        apiResponse: { accountSettings: {} },
      });
      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update account settings successfully', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'accountSettings',
        operation: 'update',
        params: {
          settingsJson: '{"enableSequentialSigningAPI":"true"}',
        },
        apiResponse: {},
      });
      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });

    it('should reject invalid JSON', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'accountSettings',
        operation: 'update',
        params: {
          settingsJson: 'not json',
        },
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow();
    });
  });

  describe('unknown operation', () => {
    it('should throw for unknown operation', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'accountSettings',
        operation: 'unknown',
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow('Unknown operation');
    });
  });
});
