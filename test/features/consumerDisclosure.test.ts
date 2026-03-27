import { describe, it, expect } from 'vitest';
import { createMockExecuteContext } from '../setup/mockContext';
import { VALID_UUID } from '../setup/constants';

describe('Consumer Disclosure', () => {
  const getNode = async () => {
    const { DocuSign } = await import('../../nodes/DocuSign/DocuSign.node');
    return new DocuSign();
  };

  describe('get', () => {
    it('should get consumer disclosure for a recipient', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'consumerDisclosure',
        operation: 'get',
        params: {
          envelopeId: VALID_UUID,
          recipientId: '1',
          langCode: 'en',
        },
        apiResponse: { accountEsignId: 'a1' },
      });
      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });

    it('should reject invalid envelope UUID', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'consumerDisclosure',
        operation: 'get',
        params: {
          envelopeId: 'bad',
          recipientId: '1',
          langCode: 'en',
        },
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow();
    });
  });

  describe('getDefault', () => {
    it('should get default consumer disclosure', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'consumerDisclosure',
        operation: 'getDefault',
        params: {},
        apiResponse: { esignAgreement: 'agreement text' },
      });
      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update consumer disclosure', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'consumerDisclosure',
        operation: 'update',
        params: {
          langCode: 'en',
          esignAgreement: 'Updated text',
          companyName: 'Acme',
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
        resource: 'consumerDisclosure',
        operation: 'unknown',
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow('Unknown operation');
    });
  });
});
