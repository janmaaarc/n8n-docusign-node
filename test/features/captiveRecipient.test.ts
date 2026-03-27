import { describe, it, expect } from 'vitest';
import { createMockExecuteContext } from '../setup/mockContext';
import { VALID_EMAIL } from '../setup/constants';

describe('Captive Recipient', () => {
  const getNode = async () => {
    const { DocuSign } = await import('../../nodes/DocuSign/DocuSign.node');
    return new DocuSign();
  };

  describe('create', () => {
    it('should create a captive recipient', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'captiveRecipient',
        operation: 'create',
        params: {
          signerEmail: VALID_EMAIL,
          signerName: 'John',
          clientUserId: 'cu-1',
        },
        apiResponse: { signers: [{ email: VALID_EMAIL }] },
      });
      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });

    it('should reject invalid email', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'captiveRecipient',
        operation: 'create',
        params: {
          signerEmail: 'bad-email',
          signerName: 'John',
          clientUserId: 'cu-1',
        },
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow();
    });

    it('should reject empty name', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'captiveRecipient',
        operation: 'create',
        params: {
          signerEmail: VALID_EMAIL,
          signerName: '',
          clientUserId: 'cu-1',
        },
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete a captive recipient', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'captiveRecipient',
        operation: 'delete',
        params: { signerEmail: VALID_EMAIL },
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
        resource: 'captiveRecipient',
        operation: 'unknown',
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow('Unknown operation');
    });
  });
});
