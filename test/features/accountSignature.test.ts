import { describe, it, expect } from 'vitest';
import { createMockExecuteContext } from '../setup/mockContext';

describe('Account Signature', () => {
  const getNode = async () => {
    const { DocuSign } = await import('../../nodes/DocuSign/DocuSign.node');
    return new DocuSign();
  };

  describe('create', () => {
    it('should create a signature successfully', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'accountSignature',
        operation: 'create',
        params: {
          signatureName: 'My Sig',
          signatureInitials: 'MS',
        },
        apiResponse: { userSignatures: [{ signatureId: 's1' }] },
      });
      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });

    it('should reject empty signature name', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'accountSignature',
        operation: 'create',
        params: {
          signatureName: '',
        },
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow();
    });
  });

  describe('get', () => {
    it('should get a signature successfully', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'accountSignature',
        operation: 'get',
        params: {
          signatureId: 's1',
        },
        apiResponse: { signatureId: 's1' },
      });
      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });
  });

  describe('getAll', () => {
    it('should get all signatures successfully', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'accountSignature',
        operation: 'getAll',
        params: {},
        apiResponse: { userSignatures: [] },
      });
      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update a signature successfully', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'accountSignature',
        operation: 'update',
        params: {
          signatureId: 's1',
          updateFields: { signatureName: 'New Name' },
        },
        apiResponse: {},
      });
      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });

    it('should reject empty updateFields', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'accountSignature',
        operation: 'update',
        params: {
          signatureId: 's1',
          updateFields: {},
        },
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete a signature successfully', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'accountSignature',
        operation: 'delete',
        params: {
          signatureId: 's1',
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
        resource: 'accountSignature',
        operation: 'unknown',
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow('Unknown operation');
    });
  });
});
