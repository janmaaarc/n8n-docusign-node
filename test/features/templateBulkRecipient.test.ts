import { describe, it, expect } from 'vitest';
import { createMockExecuteContext } from '../setup/mockContext';
import { VALID_UUID } from '../setup/constants';

describe('Template Bulk Recipient', () => {
  const getNode = async () => {
    const { DocuSign } = await import('../../nodes/DocuSign/DocuSign.node');
    return new DocuSign();
  };

  describe('upload', () => {
    it('should upload bulk recipients CSV', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'templateBulkRecipient',
        operation: 'upload',
        params: {
          templateId: VALID_UUID,
          recipientId: '1',
          csvContent: 'Name,Email\nJohn,john@example.com',
        },
        apiResponse: { bulkRecipients: [] },
      });
      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });

    it('should reject invalid templateId', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'templateBulkRecipient',
        operation: 'upload',
        params: {
          templateId: 'bad',
          recipientId: '1',
          csvContent: 'csv data',
        },
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow();
    });

    it('should reject empty CSV content', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'templateBulkRecipient',
        operation: 'upload',
        params: {
          templateId: VALID_UUID,
          recipientId: '1',
          csvContent: '',
        },
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow();
    });
  });

  describe('get', () => {
    it('should get bulk recipients for a template', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'templateBulkRecipient',
        operation: 'get',
        params: {
          templateId: VALID_UUID,
          recipientId: '1',
        },
        apiResponse: { bulkRecipients: [] },
      });
      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });
  });

  describe('delete', () => {
    it('should delete bulk recipients from a template', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'templateBulkRecipient',
        operation: 'delete',
        params: {
          templateId: VALID_UUID,
          recipientId: '1',
        },
        apiResponse: {},
      });
      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });
  });

  describe('unknown operation', () => {
    it('should throw for unknown operation', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'templateBulkRecipient',
        operation: 'unknown',
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow('Unknown operation');
    });
  });
});
