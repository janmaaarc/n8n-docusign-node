import { describe, it, expect } from 'vitest';
import { createMockExecuteContext } from '../setup/mockContext';

describe('Account Watermark', () => {
  const getNode = async () => {
    const { DocuSign } = await import('../../nodes/DocuSign/DocuSign.node');
    return new DocuSign();
  };

  describe('get', () => {
    it('should get watermark successfully', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'accountWatermark',
        operation: 'get',
        params: {},
        apiResponse: { watermarkText: 'DRAFT' },
      });
      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update watermark successfully', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'accountWatermark',
        operation: 'update',
        params: {
          enabled: true,
          watermarkText: 'SAMPLE',
          font: 'Arial',
          fontSize: '48',
          fontColor: '#000000',
        },
        apiResponse: {},
      });
      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });
  });

  describe('preview', () => {
    it('should preview watermark successfully', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'accountWatermark',
        operation: 'preview',
        params: {
          enabled: true,
          watermarkText: 'TEST',
          font: 'Arial',
          fontSize: '48',
          fontColor: '#999999',
        },
        apiResponse: { watermarkText: 'TEST' },
      });
      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });
  });

  describe('unknown operation', () => {
    it('should throw for unknown operation', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'accountWatermark',
        operation: 'unknown',
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow('Unknown operation');
    });
  });
});
