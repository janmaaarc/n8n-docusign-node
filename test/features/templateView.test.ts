import { describe, it, expect } from 'vitest';
import { createMockExecuteContext } from '../setup/mockContext';
import { VALID_UUID } from '../setup/constants';

describe('Template View', () => {
  const getNode = async () => {
    const { DocuSign } = await import('../../nodes/DocuSign/DocuSign.node');
    return new DocuSign();
  };

  describe('createEditView', () => {
    it('should create edit view successfully', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'templateView',
        operation: 'createEditView',
        params: {
          templateId: VALID_UUID,
          returnUrl: 'https://example.com/callback',
        },
        apiResponse: { url: 'https://docusign.com/edit' },
      });
      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });

    it('should reject invalid UUID', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'templateView',
        operation: 'createEditView',
        params: {
          templateId: 'bad',
          returnUrl: 'https://example.com/callback',
        },
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow();
    });
  });

  describe('unknown operation', () => {
    it('should throw for unknown operation', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'templateView',
        operation: 'unknown',
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow('Unknown operation');
    });
  });
});
