/**
 * Shared mock context factories for testing DocuSign node handlers
 */
import { VALID_UUID } from './constants';

export interface MockContextOverrides {
  resource?: string;
  operation?: string;
  params?: Record<string, unknown>;
  items?: Array<{ json: Record<string, unknown>; binary?: Record<string, { data: string }> }>;
  apiResponse?: unknown;
  apiResponses?: unknown[];
  shouldFail?: boolean;
  httpError?: Error;
}

/**
 * Creates a mock IExecuteFunctions context for testing node execution.
 */
export function createMockExecuteContext(overrides: MockContextOverrides = {}) {
  const resource = overrides.resource || 'envelope';
  const operation = overrides.operation || 'get';
  const params = overrides.params || {};
  const items = overrides.items || [{ json: {} }];
  const apiResponse = overrides.apiResponse || { envelopeId: VALID_UUID, status: 'sent' };
  let callCount = 0;

  return {
    getInputData: () => items,
    getNodeParameter: (name: string, _index: number, defaultValue?: unknown) => {
      const paramMap: Record<string, unknown> = {
        resource,
        operation,
        envelopeId: VALID_UUID,
        templateId: VALID_UUID,
        ...params,
      };
      return paramMap[name] ?? defaultValue;
    },
    getCredentials: async () => ({
      environment: 'demo',
      accountId: 'test-account-id',
      region: 'na',
    }),
    helpers: {
      httpRequestWithAuthentication: async (_cred: string, opts?: Record<string, unknown>) => {
        if (overrides.httpError) {
          throw overrides.httpError;
        }
        const resp = overrides.apiResponses
          ? overrides.apiResponses[callCount++] || apiResponse
          : apiResponse;
        // When returnFullResponse is set (binary downloads), wrap in { body: Buffer }
        if (opts && opts.returnFullResponse) {
          return { body: Buffer.from('mock-binary-content') };
        }
        return resp;
      },
      returnJsonArray: (data: unknown) => {
        if (Array.isArray(data)) {
          return data.map((item: unknown) => ({ json: item }));
        }
        return [{ json: data }];
      },
      constructExecutionMetaData: (items: unknown[]) => items,
      prepareBinaryData: async (buffer: Buffer, fileName: string, mimeType: string) => ({
        data: buffer.toString('base64'),
        fileName,
        mimeType,
      }),
    },
    getNode: () => ({ name: 'DocuSign' }),
    continueOnFail: () => overrides.shouldFail === true,
  };
}
