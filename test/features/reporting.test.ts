import { describe, it, expect } from 'vitest';
import { createMockExecuteContext } from '../setup/mockContext';

describe('Reporting', () => {
  const getNode = async () => {
    const { DocuSign } = await import('../../nodes/DocuSign/DocuSign.node');
    return new DocuSign();
  };

  describe('getProductPermissionProfiles', () => {
    it('should get product permission profiles successfully', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'reporting',
        operation: 'getProductPermissionProfiles',
        params: {},
        apiResponse: { productPermissionProfiles: [] },
      });
      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });
  });

  describe('getReportInAccount', () => {
    it('should get report in account successfully', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'reporting',
        operation: 'getReportInAccount',
        params: {
          startDate: '',
          endDate: '',
        },
        apiResponse: { reports: [] },
      });
      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });
  });

  describe('unknown operation', () => {
    it('should throw for unknown operation', async () => {
      const node = await getNode();
      const ctx = createMockExecuteContext({
        resource: 'reporting',
        operation: 'unknown',
      });
      await expect(node.execute.call(ctx as never)).rejects.toThrow('Unknown operation');
    });
  });
});
