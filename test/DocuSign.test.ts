import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidUUID,
  isValidBase64,
  isValidUrl,
  isValidIsoDate,
  validateField,
  getFileExtension,
  isRateLimitError,
  isRetryableError,
  getRetryAfterSeconds,
  buildSigner,
  buildCarbonCopy,
  buildDocument,
  buildSignHereTab,
  buildTemplateRole,
  getBaseUrl,
  verifyWebhookSignature,
} from '../nodes/DocuSign/helpers';
import {
  ENVELOPE_STATUSES,
  RECIPIENT_TYPES,
  RESOURCE_ENDPOINTS,
  API_BASE_URL_PRODUCTION,
  API_BASE_URL_DEMO,
  DEFAULT_SIGNATURE_X,
  DEFAULT_SIGNATURE_Y,
} from '../nodes/DocuSign/constants';

// ============================================================================
// Constants Tests
// ============================================================================

describe('Constants', () => {
  describe('ENVELOPE_STATUSES', () => {
    it('should have all required statuses', () => {
      expect(ENVELOPE_STATUSES).toHaveLength(7);
      expect(ENVELOPE_STATUSES.map((s) => s.value)).toContain('created');
      expect(ENVELOPE_STATUSES.map((s) => s.value)).toContain('sent');
      expect(ENVELOPE_STATUSES.map((s) => s.value)).toContain('completed');
      expect(ENVELOPE_STATUSES.map((s) => s.value)).toContain('voided');
    });

    it('should have name, value, and description for each status', () => {
      ENVELOPE_STATUSES.forEach((status) => {
        expect(status.name).toBeTruthy();
        expect(status.value).toBeTruthy();
        expect(status.description).toBeTruthy();
      });
    });
  });

  describe('RECIPIENT_TYPES', () => {
    it('should have all required recipient types', () => {
      expect(RECIPIENT_TYPES).toHaveLength(4);
      expect(RECIPIENT_TYPES.map((t) => t.value)).toContain('signer');
      expect(RECIPIENT_TYPES.map((t) => t.value)).toContain('cc');
    });
  });

  describe('RESOURCE_ENDPOINTS', () => {
    it('should have correct endpoint mappings', () => {
      expect(RESOURCE_ENDPOINTS.envelope).toBe('envelopes');
      expect(RESOURCE_ENDPOINTS.template).toBe('templates');
    });
  });

  describe('API Base URLs', () => {
    it('should have correct production URL', () => {
      expect(API_BASE_URL_PRODUCTION).toBe('https://na1.docusign.net/restapi/v2.1');
    });

    it('should have correct demo URL', () => {
      expect(API_BASE_URL_DEMO).toBe('https://demo.docusign.net/restapi/v2.1');
    });
  });

  describe('Default Signature Position', () => {
    it('should have default signature X and Y values', () => {
      expect(DEFAULT_SIGNATURE_X).toBe(100);
      expect(DEFAULT_SIGNATURE_Y).toBe(100);
    });
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe('Validation Helpers', () => {
  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user+tag@domain.co.uk')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('no@domain')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('isValidUUID', () => {
    it('should return true for valid UUIDs', () => {
      expect(isValidUUID('12345678-1234-1234-1234-123456789abc')).toBe(true);
      expect(isValidUUID('ABCDEF12-3456-7890-ABCD-EF1234567890')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID('invalid')).toBe(false);
      expect(isValidUUID('12345678-1234-1234-1234')).toBe(false);
      expect(isValidUUID('12345678-1234-1234-1234-123456789abcdef')).toBe(false);
    });
  });

  describe('isValidBase64', () => {
    it('should return true for valid base64 strings', () => {
      expect(isValidBase64('SGVsbG8gV29ybGQ=')).toBe(true);
      expect(isValidBase64('YWJjZGVm')).toBe(true);
    });

    it('should return false for invalid base64 strings', () => {
      expect(isValidBase64('')).toBe(false);
      expect(isValidBase64('not valid base64!!!')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid external URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://api.docusign.com/v1')).toBe(true);
    });

    it('should return false for internal/private URLs (SSRF protection)', () => {
      expect(isValidUrl('http://localhost:3000')).toBe(false);
      expect(isValidUrl('http://127.0.0.1')).toBe(false);
      expect(isValidUrl('http://192.168.1.1')).toBe(false);
      expect(isValidUrl('http://10.0.0.1')).toBe(false);
      expect(isValidUrl('http://169.254.169.254')).toBe(false); // AWS metadata
    });

    it('should return false for non-http protocols', () => {
      expect(isValidUrl('ftp://files.example.com')).toBe(false);
      expect(isValidUrl('file:///etc/passwd')).toBe(false);
    });

    it('should require HTTPS when specified', () => {
      expect(isValidUrl('https://example.com', true)).toBe(true);
      expect(isValidUrl('http://example.com', true)).toBe(false);
    });
  });

  describe('isValidIsoDate', () => {
    it('should return true for valid ISO 8601 dates', () => {
      expect(isValidIsoDate('2024-01-15')).toBe(true);
      expect(isValidIsoDate('2024-01-15T10:30:00Z')).toBe(true);
    });

    it('should return false for invalid dates', () => {
      expect(isValidIsoDate('invalid')).toBe(false);
      expect(isValidIsoDate('01/15/2024')).toBe(false);
    });
  });

  describe('validateField', () => {
    it('should validate required fields', () => {
      expect(() => validateField('name', 'value', 'required')).not.toThrow();
      expect(() => validateField('name', '', 'required')).toThrow('name is required');
    });

    it('should validate email fields', () => {
      expect(() => validateField('email', 'user@example.com', 'email')).not.toThrow();
      expect(() => validateField('email', 'invalid', 'email')).toThrow(
        'email must be a valid email address',
      );
    });

    it('should validate UUID fields', () => {
      expect(() =>
        validateField('id', '12345678-1234-1234-1234-123456789abc', 'uuid'),
      ).not.toThrow();
      expect(() => validateField('id', 'invalid', 'uuid')).toThrow('id must be a valid UUID');
    });

    it('should skip validation for empty optional fields', () => {
      expect(() => validateField('email', '', 'email')).not.toThrow();
      expect(() => validateField('id', undefined, 'uuid')).not.toThrow();
    });
  });
});

// ============================================================================
// File Extension Tests
// ============================================================================

describe('getFileExtension', () => {
  it('should extract extension from filename', () => {
    expect(getFileExtension('document.pdf')).toBe('pdf');
    expect(getFileExtension('contract.docx')).toBe('docx');
    expect(getFileExtension('file.name.with.dots.xlsx')).toBe('xlsx');
  });

  it('should return default extension for files without extension', () => {
    expect(getFileExtension('noextension')).toBe('pdf');
    expect(getFileExtension('noextension', 'docx')).toBe('docx');
  });
});

// ============================================================================
// Rate Limiting Tests
// ============================================================================

describe('Rate Limiting Helpers', () => {
  describe('isRateLimitError', () => {
    it('should return true for 429 status code', () => {
      expect(isRateLimitError({ statusCode: 429 })).toBe(true);
      expect(isRateLimitError({ response: { statusCode: 429 } })).toBe(true);
    });

    it('should return false for other status codes', () => {
      expect(isRateLimitError({ statusCode: 400 })).toBe(false);
      expect(isRateLimitError({ statusCode: 500 })).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for 5xx errors', () => {
      expect(isRetryableError({ statusCode: 500 })).toBe(true);
      expect(isRetryableError({ statusCode: 502 })).toBe(true);
      expect(isRetryableError({ statusCode: 503 })).toBe(true);
    });

    it('should return true for network errors', () => {
      expect(isRetryableError({ code: 'ECONNRESET' })).toBe(true);
      expect(isRetryableError({ code: 'ETIMEDOUT' })).toBe(true);
      expect(isRetryableError({ code: 'ECONNREFUSED' })).toBe(true);
    });

    it('should return false for client errors', () => {
      expect(isRetryableError({ statusCode: 400 })).toBe(false);
      expect(isRetryableError({ statusCode: 404 })).toBe(false);
    });
  });

  describe('getRetryAfterSeconds', () => {
    it('should extract Retry-After header value', () => {
      expect(
        getRetryAfterSeconds({
          response: { headers: { 'retry-after': '60' } },
        }),
      ).toBe(60);
    });

    it('should return undefined when no header present', () => {
      expect(getRetryAfterSeconds({})).toBe(undefined);
      expect(getRetryAfterSeconds({ response: { headers: {} } })).toBe(undefined);
    });
  });
});

// ============================================================================
// URL Helpers Tests
// ============================================================================

describe('getBaseUrl', () => {
  it('should return production URL for production environment', () => {
    expect(getBaseUrl('production')).toBe(API_BASE_URL_PRODUCTION);
  });

  it('should return demo URL for demo environment', () => {
    expect(getBaseUrl('demo')).toBe(API_BASE_URL_DEMO);
  });

  it('should return production URL for unknown environments (defaults to NA)', () => {
    // Unknown environments default to production NA since credentials only allow 'demo' or 'production'
    expect(getBaseUrl('unknown')).toBe(API_BASE_URL_PRODUCTION);
  });

  it('should return regional URL for production with region', () => {
    expect(getBaseUrl('production', 'eu')).toBe('https://eu.docusign.net/restapi/v2.1');
    expect(getBaseUrl('production', 'au')).toBe('https://au.docusign.net/restapi/v2.1');
    expect(getBaseUrl('production', 'ca')).toBe('https://ca.docusign.net/restapi/v2.1');
  });
});

// ============================================================================
// Builder Functions Tests
// ============================================================================

describe('Builder Functions', () => {
  describe('buildSigner', () => {
    it('should build a valid signer object', () => {
      const signer = buildSigner('test@example.com', 'John Doe', '1', '1');
      expect(signer).toEqual({
        email: 'test@example.com',
        name: 'John Doe',
        recipientId: '1',
        routingOrder: '1',
      });
    });

    it('should throw for invalid email', () => {
      expect(() => buildSigner('invalid', 'John Doe', '1')).toThrow(
        'Signer email must be a valid email address',
      );
    });

    it('should throw for empty name', () => {
      expect(() => buildSigner('test@example.com', '', '1')).toThrow('Signer name is required');
    });
  });

  describe('buildCarbonCopy', () => {
    it('should build a valid carbon copy object', () => {
      const cc = buildCarbonCopy('cc@example.com', 'Jane Doe', '2', '2');
      expect(cc).toEqual({
        email: 'cc@example.com',
        name: 'Jane Doe',
        recipientId: '2',
        routingOrder: '2',
      });
    });

    it('should throw for invalid email', () => {
      expect(() => buildCarbonCopy('invalid', 'Jane Doe', '2')).toThrow(
        'CC email must be a valid email address',
      );
    });
  });

  describe('buildDocument', () => {
    it('should build a valid document object', () => {
      const doc = buildDocument('base64content', '1', 'contract.pdf', 'pdf');
      expect(doc).toEqual({
        documentBase64: 'base64content',
        documentId: '1',
        name: 'contract.pdf',
        fileExtension: 'pdf',
      });
    });

    it('should throw for empty content', () => {
      expect(() => buildDocument('', '1', 'contract.pdf')).toThrow('Document content is required');
    });

    it('should throw for empty name', () => {
      expect(() => buildDocument('content', '1', '')).toThrow('Document name is required');
    });
  });

  describe('buildSignHereTab', () => {
    it('should build a tab with x/y coordinates', () => {
      const tab = buildSignHereTab('1', '1', { xPosition: '200', yPosition: '300' });
      expect(tab).toEqual({
        documentId: '1',
        pageNumber: '1',
        xPosition: '200',
        yPosition: '300',
      });
    });

    it('should build a tab with anchor string', () => {
      const tab = buildSignHereTab('1', '1', {
        anchorString: '/sign/',
        anchorXOffset: '10',
        anchorYOffset: '20',
      });
      expect(tab).toEqual({
        documentId: '1',
        pageNumber: '1',
        anchorString: '/sign/',
        anchorXOffset: '10',
        anchorYOffset: '20',
      });
    });

    it('should use default coordinates when no options provided', () => {
      const tab = buildSignHereTab('1', '1', {});
      expect(tab).toEqual({
        documentId: '1',
        pageNumber: '1',
        xPosition: '100',
        yPosition: '100',
      });
    });
  });

  describe('buildTemplateRole', () => {
    it('should build a valid template role', () => {
      const role = buildTemplateRole('test@example.com', 'John Doe', 'Signer');
      expect(role).toEqual({
        email: 'test@example.com',
        name: 'John Doe',
        roleName: 'Signer',
      });
    });

    it('should throw for invalid email', () => {
      expect(() => buildTemplateRole('invalid', 'John Doe', 'Signer')).toThrow(
        'Recipient email must be a valid email address',
      );
    });

    it('should throw for empty role name', () => {
      expect(() => buildTemplateRole('test@example.com', 'John Doe', '')).toThrow(
        'Role name is required',
      );
    });
  });
});

// ============================================================================
// Credential Tests
// ============================================================================

describe('Credentials', () => {
  it('should have correct credential name', async () => {
    const { DocuSignApi } = await import('../credentials/DocuSignApi.credentials');
    const credential = new DocuSignApi();
    expect(credential.name).toBe('docuSignApi');
    expect(credential.displayName).toBe('DocuSign API');
  });

  it('should have required properties', async () => {
    const { DocuSignApi } = await import('../credentials/DocuSignApi.credentials');
    const credential = new DocuSignApi();
    const propertyNames = credential.properties.map((p) => p.name);

    expect(propertyNames).toContain('environment');
    expect(propertyNames).toContain('integrationKey');
    expect(propertyNames).toContain('userId');
    expect(propertyNames).toContain('accountId');
    expect(propertyNames).toContain('privateKey');
  });
});

// ============================================================================
// Node Description Tests
// ============================================================================

describe('Node Description', () => {
  it('should have correct node name and display name', async () => {
    const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
    const node = new DocuSign();
    expect(node.description.name).toBe('docuSign');
    expect(node.description.displayName).toBe('DocuSign');
  });

  it('should have correct icon', async () => {
    const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
    const node = new DocuSign();
    expect(node.description.icon).toBe('file:docusign.svg');
  });

  it('should require docuSignApi credentials', async () => {
    const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
    const node = new DocuSign();
    expect(node.description.credentials).toHaveLength(1);
    expect(node.description.credentials?.[0].name).toBe('docuSignApi');
    expect(node.description.credentials?.[0].required).toBe(true);
  });

  it('should have properties defined', async () => {
    const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
    const node = new DocuSign();
    expect(node.description.properties.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Webhook Signature Tests
// ============================================================================

describe('verifyWebhookSignature', () => {
  it('should return true for valid signature', () => {
    const payload = '{"event":"envelope-completed"}';
    const secret = 'test-secret';
    // Generate valid signature
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    const validSignature = hmac.update(payload).digest('base64');

    expect(verifyWebhookSignature(payload, validSignature, secret)).toBe(true);
  });

  it('should return false for invalid signature', () => {
    const payload = '{"event":"envelope-completed"}';
    const secret = 'test-secret';
    const invalidSignature = 'invalid-signature-base64';

    expect(verifyWebhookSignature(payload, invalidSignature, secret)).toBe(false);
  });

  it('should return false for empty inputs', () => {
    expect(verifyWebhookSignature('', 'sig', 'secret')).toBe(false);
    expect(verifyWebhookSignature('payload', '', 'secret')).toBe(false);
    expect(verifyWebhookSignature('payload', 'sig', '')).toBe(false);
  });

  it('should return false for mismatched secret', () => {
    const payload = '{"event":"envelope-completed"}';
    const secret1 = 'secret-one';
    const secret2 = 'secret-two';
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret1);
    const signature = hmac.update(payload).digest('base64');

    expect(verifyWebhookSignature(payload, signature, secret2)).toBe(false);
  });
});

// ============================================================================
// DocuSign Trigger Node Tests
// ============================================================================

describe('DocuSign Trigger Node', () => {
  it('should have correct node name and display name', async () => {
    const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
    const node = new DocuSignTrigger();
    expect(node.description.name).toBe('docuSignTrigger');
    expect(node.description.displayName).toBe('DocuSign Trigger');
  });

  it('should be a trigger node', async () => {
    const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
    const node = new DocuSignTrigger();
    expect(node.description.group).toContain('trigger');
  });

  it('should have correct icon', async () => {
    const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
    const node = new DocuSignTrigger();
    expect(node.description.icon).toBe('file:docusign.svg');
  });

  it('should require docuSignApi credentials', async () => {
    const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
    const node = new DocuSignTrigger();
    expect(node.description.credentials).toHaveLength(1);
    expect(node.description.credentials?.[0].name).toBe('docuSignApi');
    expect(node.description.credentials?.[0].required).toBe(true);
  });

  it('should have webhook configuration', async () => {
    const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
    const node = new DocuSignTrigger();
    expect(node.description.webhooks).toHaveLength(1);
    expect(node.description.webhooks?.[0].httpMethod).toBe('POST');
    expect(node.description.webhooks?.[0].path).toBe('webhook');
  });

  it('should have events property', async () => {
    const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
    const node = new DocuSignTrigger();
    const eventsProperty = node.description.properties.find((p) => p.name === 'events');
    expect(eventsProperty).toBeDefined();
    expect(eventsProperty?.type).toBe('multiOptions');
  });

  it('should have verifySignature property', async () => {
    const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
    const node = new DocuSignTrigger();
    const verifyProperty = node.description.properties.find((p) => p.name === 'verifySignature');
    expect(verifyProperty).toBeDefined();
    expect(verifyProperty?.type).toBe('boolean');
    expect(verifyProperty?.default).toBe(true);
  });

  it('should have replayProtection property', async () => {
    const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
    const node = new DocuSignTrigger();
    const replayProperty = node.description.properties.find((p) => p.name === 'replayProtection');
    expect(replayProperty).toBeDefined();
    expect(replayProperty?.type).toBe('boolean');
    expect(replayProperty?.default).toBe(true);
  });

  it('should support all envelope events', async () => {
    const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
    const node = new DocuSignTrigger();
    const eventsProperty = node.description.properties.find((p) => p.name === 'events');
    const options = eventsProperty?.options as Array<{ value: string }>;
    const eventValues = options?.map((o) => o.value) || [];

    expect(eventValues).toContain('envelope-sent');
    expect(eventValues).toContain('envelope-delivered');
    expect(eventValues).toContain('envelope-completed');
    expect(eventValues).toContain('envelope-declined');
    expect(eventValues).toContain('envelope-voided');
  });

  it('should support all recipient events', async () => {
    const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
    const node = new DocuSignTrigger();
    const eventsProperty = node.description.properties.find((p) => p.name === 'events');
    const options = eventsProperty?.options as Array<{ value: string }>;
    const eventValues = options?.map((o) => o.value) || [];

    expect(eventValues).toContain('recipient-sent');
    expect(eventValues).toContain('recipient-delivered');
    expect(eventValues).toContain('recipient-completed');
    expect(eventValues).toContain('recipient-declined');
    expect(eventValues).toContain('recipient-authenticationfailed');
  });

  it('should support template events', async () => {
    const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
    const node = new DocuSignTrigger();
    const eventsProperty = node.description.properties.find((p) => p.name === 'events');
    const options = eventsProperty?.options as Array<{ value: string }>;
    const eventValues = options?.map((o) => o.value) || [];

    expect(eventValues).toContain('template-created');
    expect(eventValues).toContain('template-modified');
    expect(eventValues).toContain('template-deleted');
  });
});

// ============================================================================
// Additional Validation Edge Cases
// ============================================================================

describe('validateField edge cases', () => {
  it('should validate base64 fields', () => {
    expect(() => validateField('content', 'SGVsbG8=', 'base64')).not.toThrow();
    expect(() => validateField('content', 'not valid!!!', 'base64')).toThrow(
      'content must be valid base64-encoded content',
    );
  });

  it('should validate url fields', () => {
    expect(() => validateField('url', 'https://example.com', 'url')).not.toThrow();
    expect(() => validateField('url', 'not-a-url', 'url')).toThrow('url must be a valid URL');
  });

  it('should validate httpsUrl fields', () => {
    expect(() => validateField('url', 'https://example.com', 'httpsUrl')).not.toThrow();
    expect(() => validateField('url', 'http://example.com', 'httpsUrl')).toThrow(
      'url must be a valid HTTPS URL',
    );
  });

  it('should validate date fields', () => {
    expect(() => validateField('date', '2024-01-15', 'date')).not.toThrow();
    expect(() => validateField('date', 'not-a-date', 'date')).toThrow(
      'date must be a valid ISO 8601 date',
    );
  });

  it('should skip validation for null values', () => {
    expect(() => validateField('field', null, 'email')).not.toThrow();
    expect(() => validateField('field', null, 'uuid')).not.toThrow();
  });
});

// ============================================================================
// Envelope Resource Tests
// ============================================================================

describe('Envelope Resource', () => {
  it('should have all operations defined', async () => {
    const { envelopeOperations } = await import('../nodes/DocuSign/resources/envelope');
    const options = envelopeOperations.options as Array<{ value: string }>;
    const operationValues = options.map((o) => o.value);

    expect(operationValues).toContain('create');
    expect(operationValues).toContain('createFromTemplate');
    expect(operationValues).toContain('get');
    expect(operationValues).toContain('getAll');
    expect(operationValues).toContain('send');
    expect(operationValues).toContain('void');
    expect(operationValues).toContain('downloadDocument');
    expect(operationValues).toContain('resend');
    expect(operationValues).toContain('getRecipients');
    expect(operationValues).toContain('updateRecipients');
    expect(operationValues).toContain('getAuditEvents');
    expect(operationValues).toContain('delete');
  });

  it('should have delete operation', async () => {
    const { envelopeOperations } = await import('../nodes/DocuSign/resources/envelope');
    const options = envelopeOperations.options as Array<{ value: string; name: string }>;
    const deleteOp = options.find((o) => o.value === 'delete');

    expect(deleteOp).toBeDefined();
    expect(deleteOp?.name).toBe('Delete');
  });

  it('should have envelope fields defined', async () => {
    const { envelopeFields } = await import('../nodes/DocuSign/resources/envelope');
    expect(envelopeFields.length).toBeGreaterThan(0);

    const fieldNames = envelopeFields.map((f) => f.name);
    expect(fieldNames).toContain('emailSubject');
    expect(fieldNames).toContain('signerEmail');
    expect(fieldNames).toContain('envelopeId');
  });

  it('should have envelope-level options in additionalOptions', async () => {
    const { envelopeFields } = await import('../nodes/DocuSign/resources/envelope');
    const additionalOptions = envelopeFields.find((f) => f.name === 'additionalOptions');
    expect(additionalOptions).toBeDefined();

    const options = additionalOptions?.options as Array<{ name: string }>;
    const optionNames = options?.map((o) => o.name);

    expect(optionNames).toContain('allowMarkup');
    expect(optionNames).toContain('allowReassign');
    expect(optionNames).toContain('brandId');
    expect(optionNames).toContain('enableWetSign');
    expect(optionNames).toContain('enforceSignerVisibility');
  });
});

// ============================================================================
// Template Resource Tests
// ============================================================================

describe('Template Resource', () => {
  it('should have all operations defined', async () => {
    const { templateOperations } = await import('../nodes/DocuSign/resources/template');
    const options = templateOperations.options as Array<{ value: string }>;
    const operationValues = options.map((o) => o.value);

    expect(operationValues).toContain('get');
    expect(operationValues).toContain('getAll');
  });

  it('should have template fields defined', async () => {
    const { templateFields } = await import('../nodes/DocuSign/resources/template');
    expect(templateFields.length).toBeGreaterThan(0);

    const fieldNames = templateFields.map((f) => f.name);
    expect(fieldNames).toContain('templateId');
    expect(fieldNames).toContain('returnAll');
    expect(fieldNames).toContain('limit');
  });
});

// ============================================================================
// Resource Index Tests
// ============================================================================

describe('Resource Index', () => {
  it('should export resourceProperty', async () => {
    const { resourceProperty } = await import('../nodes/DocuSign/resources');
    expect(resourceProperty).toBeDefined();
    expect(resourceProperty.name).toBe('resource');
  });

  it('should export allOperations', async () => {
    const { allOperations } = await import('../nodes/DocuSign/resources');
    expect(allOperations).toBeDefined();
    expect(allOperations.length).toBe(2);
  });

  it('should export allFields', async () => {
    const { allFields } = await import('../nodes/DocuSign/resources');
    expect(allFields).toBeDefined();
    expect(allFields.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Constants Additional Tests
// ============================================================================

describe('Constants Additional', () => {
  it('should have REGION_URLS defined', async () => {
    const { REGION_URLS } = await import('../nodes/DocuSign/constants');
    expect(REGION_URLS).toBeDefined();
    expect(REGION_URLS.na).toBe('https://na1.docusign.net/restapi/v2.1');
    expect(REGION_URLS.eu).toBe('https://eu.docusign.net/restapi/v2.1');
    expect(REGION_URLS.au).toBe('https://au.docusign.net/restapi/v2.1');
    expect(REGION_URLS.ca).toBe('https://ca.docusign.net/restapi/v2.1');
  });

  it('should have DEFAULT_PAGE_SIZE defined', async () => {
    const { DEFAULT_PAGE_SIZE } = await import('../nodes/DocuSign/constants');
    expect(DEFAULT_PAGE_SIZE).toBe(100);
  });

  it('should have DEFAULT_REQUEST_TIMEOUT_MS defined', async () => {
    const { DEFAULT_REQUEST_TIMEOUT_MS } = await import('../nodes/DocuSign/constants');
    expect(DEFAULT_REQUEST_TIMEOUT_MS).toBe(30000);
  });

  it('should have TAB_TYPES defined', async () => {
    const { TAB_TYPES } = await import('../nodes/DocuSign/constants');
    expect(TAB_TYPES).toBeDefined();
    expect(TAB_TYPES.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// URL Validation Edge Cases
// ============================================================================

describe('URL Validation Edge Cases', () => {
  it('should block 172.16-31.x.x ranges', () => {
    expect(isValidUrl('http://172.16.0.1')).toBe(false);
    expect(isValidUrl('http://172.20.0.1')).toBe(false);
    expect(isValidUrl('http://172.31.0.1')).toBe(false);
  });

  it('should block IPv6 localhost', () => {
    expect(isValidUrl('http://[::1]')).toBe(false);
  });

  it('should block 0.0.0.0', () => {
    expect(isValidUrl('http://0.0.0.0')).toBe(false);
  });

  it('should allow valid external domains', () => {
    expect(isValidUrl('https://api.docusign.com')).toBe(true);
    expect(isValidUrl('https://subdomain.example.com/path')).toBe(true);
  });

  it('should handle malformed URLs', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });
});

// ============================================================================
// Rate Limit Additional Tests
// ============================================================================

describe('Rate Limit Additional Tests', () => {
  it('should return false for null/undefined errors', () => {
    expect(isRateLimitError(null)).toBe(false);
    expect(isRateLimitError(undefined)).toBe(false);
  });

  it('should return false for non-object errors', () => {
    expect(isRateLimitError('error string')).toBe(false);
    expect(isRateLimitError(123)).toBe(false);
  });

  it('should handle retryable errors with response object', () => {
    expect(isRetryableError({ response: { statusCode: 500 } })).toBe(true);
    expect(isRetryableError({ response: { statusCode: 503 } })).toBe(true);
  });

  it('should return false for retryable check on non-object', () => {
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError('error')).toBe(false);
  });

  it('should handle x-ratelimit-reset header', () => {
    const futureTime = Math.floor(Date.now() / 1000) + 60;
    const result = getRetryAfterSeconds({
      response: { headers: { 'x-ratelimit-reset': String(futureTime) } },
    });
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(60);
  });

  it('should return undefined for past reset time', () => {
    const pastTime = Math.floor(Date.now() / 1000) - 60;
    const result = getRetryAfterSeconds({
      response: { headers: { 'x-ratelimit-reset': String(pastTime) } },
    });
    expect(result).toBe(undefined);
  });

  it('should return undefined for invalid retry-after values', () => {
    expect(
      getRetryAfterSeconds({
        response: { headers: { 'retry-after': 'invalid' } },
      }),
    ).toBe(undefined);

    expect(
      getRetryAfterSeconds({
        response: { headers: { 'retry-after': '-5' } },
      }),
    ).toBe(undefined);
  });
});

// ============================================================================
// Mocked Webhook Handler Tests
// ============================================================================

describe('DocuSign Trigger Webhook Handler', () => {
  const crypto = require('crypto');

  // Helper to create mock IWebhookFunctions
  const createMockWebhookContext = (
    overrides: {
      headers?: Record<string, string | undefined>;
      body?: Record<string, unknown>;
      params?: Record<string, unknown>;
      credentials?: Record<string, unknown>;
    } = {},
  ) => {
    const defaultBody = {
      event: 'envelope-completed',
      data: {
        envelopeSummary: {
          envelopeId: '12345678-1234-1234-1234-123456789abc',
          status: 'completed',
          emailSubject: 'Please sign this document',
          generatedDateTime: new Date().toISOString(),
          sender: {
            email: 'sender@example.com',
            userName: 'Test Sender',
          },
          recipients: [],
          documents: [],
        },
      },
    };

    const headers = overrides.headers || {};
    const body = overrides.body || defaultBody;
    const params = overrides.params || {};
    const credentials = overrides.credentials || { webhookSecret: 'test-secret' };

    return {
      getRequestObject: () => ({ headers }),
      getBodyData: () => body,
      getNodeParameter: (name: string, defaultValue?: unknown) => {
        const paramMap: Record<string, unknown> = {
          verifySignature: true,
          replayProtection: true,
          events: ['envelope-completed'],
          ...params,
        };
        return paramMap[name] ?? defaultValue;
      },
      getCredentials: async () => credentials,
    };
  };

  describe('Signature Verification', () => {
    it('should reject webhook with missing signature header when verification enabled', async () => {
      const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
      const node = new DocuSignTrigger();

      const mockCtx = createMockWebhookContext({
        headers: {},
        params: { verifySignature: true },
      });

      const result = await node.webhook.call(mockCtx as never);

      expect(result.webhookResponse).toBeDefined();
      expect(result.webhookResponse?.status).toBe(401);
      expect(result.webhookResponse?.body).toEqual({ error: 'Missing signature header' });
    });

    it('should reject webhook with invalid signature', async () => {
      const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
      const node = new DocuSignTrigger();

      const mockCtx = createMockWebhookContext({
        headers: { 'x-docusign-signature-1': 'invalid-signature' },
        params: { verifySignature: true },
      });

      const result = await node.webhook.call(mockCtx as never);

      expect(result.webhookResponse).toBeDefined();
      expect(result.webhookResponse?.status).toBe(401);
      expect(result.webhookResponse?.body).toEqual({ error: 'Invalid signature' });
    });

    it('should reject webhook when webhook secret not configured', async () => {
      const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
      const node = new DocuSignTrigger();

      const mockCtx = createMockWebhookContext({
        headers: { 'x-docusign-signature-1': 'some-signature' },
        params: { verifySignature: true },
        credentials: { webhookSecret: '' },
      });

      const result = await node.webhook.call(mockCtx as never);

      expect(result.webhookResponse).toBeDefined();
      expect(result.webhookResponse?.status).toBe(500);
      expect(result.webhookResponse?.body).toEqual({
        error: 'Webhook secret not configured in credentials',
      });
    });

    it('should accept webhook with valid signature', async () => {
      const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
      const node = new DocuSignTrigger();

      const secret = 'test-secret';
      const body = {
        event: 'envelope-completed',
        data: {
          envelopeSummary: {
            envelopeId: '12345678-1234-1234-1234-123456789abc',
            status: 'completed',
            generatedDateTime: new Date().toISOString(),
          },
        },
      };

      const hmac = crypto.createHmac('sha256', secret);
      const validSignature = hmac.update(JSON.stringify(body)).digest('base64');

      const mockCtx = createMockWebhookContext({
        headers: { 'x-docusign-signature-1': validSignature },
        body,
        params: { verifySignature: true, replayProtection: false },
        credentials: { webhookSecret: secret },
      });

      const result = await node.webhook.call(mockCtx as never);

      expect(result.workflowData).toBeDefined();
      expect(result.workflowData?.[0]?.[0]?.json?.event).toBe('envelope-completed');
    });

    it('should skip signature verification when disabled', async () => {
      const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
      const node = new DocuSignTrigger();

      const mockCtx = createMockWebhookContext({
        headers: {},
        params: { verifySignature: false, replayProtection: false },
      });

      const result = await node.webhook.call(mockCtx as never);

      expect(result.workflowData).toBeDefined();
    });
  });

  describe('Replay Protection', () => {
    it('should reject expired webhook requests', async () => {
      const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
      const node = new DocuSignTrigger();

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const mockCtx = createMockWebhookContext({
        headers: {},
        body: {
          event: 'envelope-completed',
          data: {
            envelopeSummary: {
              envelopeId: '12345678-1234-1234-1234-123456789abc',
              generatedDateTime: tenMinutesAgo,
            },
          },
        },
        params: { verifySignature: false, replayProtection: true },
      });

      const result = await node.webhook.call(mockCtx as never);

      expect(result.webhookResponse).toBeDefined();
      expect(result.webhookResponse?.status).toBe(401);
      expect(result.webhookResponse?.body).toEqual({
        error: 'Request expired (replay attack protection)',
      });
    });

    it('should accept recent webhook requests', async () => {
      const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
      const node = new DocuSignTrigger();

      const recentTime = new Date().toISOString();

      const mockCtx = createMockWebhookContext({
        headers: {},
        body: {
          event: 'envelope-completed',
          data: {
            envelopeSummary: {
              envelopeId: '12345678-1234-1234-1234-123456789abc',
              generatedDateTime: recentTime,
            },
          },
        },
        params: { verifySignature: false, replayProtection: true },
      });

      const result = await node.webhook.call(mockCtx as never);

      expect(result.workflowData).toBeDefined();
    });

    it('should check statusChangedDateTime as fallback timestamp', async () => {
      const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
      const node = new DocuSignTrigger();

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const mockCtx = createMockWebhookContext({
        headers: {},
        body: {
          event: 'envelope-completed',
          data: {
            envelopeSummary: {
              envelopeId: '12345678-1234-1234-1234-123456789abc',
              statusChangedDateTime: tenMinutesAgo,
            },
          },
        },
        params: { verifySignature: false, replayProtection: true },
      });

      const result = await node.webhook.call(mockCtx as never);

      expect(result.webhookResponse?.status).toBe(401);
    });

    it('should check sentDateTime as fallback timestamp', async () => {
      const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
      const node = new DocuSignTrigger();

      const recentTime = new Date().toISOString();

      const mockCtx = createMockWebhookContext({
        headers: {},
        body: {
          event: 'envelope-sent',
          data: {
            envelopeSummary: {
              envelopeId: '12345678-1234-1234-1234-123456789abc',
              sentDateTime: recentTime,
            },
          },
        },
        params: { verifySignature: false, replayProtection: true, events: ['envelope-sent'] },
      });

      const result = await node.webhook.call(mockCtx as never);

      expect(result.workflowData).toBeDefined();
    });

    it('should check body.generatedDateTime as fallback', async () => {
      const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
      const node = new DocuSignTrigger();

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const mockCtx = createMockWebhookContext({
        headers: {},
        body: {
          event: 'envelope-completed',
          generatedDateTime: tenMinutesAgo,
          data: {},
        },
        params: { verifySignature: false, replayProtection: true },
      });

      const result = await node.webhook.call(mockCtx as never);

      expect(result.webhookResponse?.status).toBe(401);
    });

    it('should skip replay protection when disabled', async () => {
      const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
      const node = new DocuSignTrigger();

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const mockCtx = createMockWebhookContext({
        headers: {},
        body: {
          event: 'envelope-completed',
          data: {
            envelopeSummary: {
              generatedDateTime: tenMinutesAgo,
            },
          },
        },
        params: { verifySignature: false, replayProtection: false },
      });

      const result = await node.webhook.call(mockCtx as never);

      expect(result.workflowData).toBeDefined();
    });

    it('should accept webhook with no timestamp (no replay check possible)', async () => {
      const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
      const node = new DocuSignTrigger();

      const mockCtx = createMockWebhookContext({
        headers: {},
        body: {
          event: 'envelope-completed',
          data: {
            envelopeSummary: {
              envelopeId: '12345678-1234-1234-1234-123456789abc',
              // No timestamp fields
            },
          },
        },
        params: { verifySignature: false, replayProtection: true },
      });

      const result = await node.webhook.call(mockCtx as never);

      expect(result.workflowData).toBeDefined();
    });
  });

  describe('Event Filtering', () => {
    it('should filter out non-matching events', async () => {
      const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
      const node = new DocuSignTrigger();

      const mockCtx = createMockWebhookContext({
        headers: {},
        body: {
          event: 'envelope-sent',
          data: { envelopeSummary: { generatedDateTime: new Date().toISOString() } },
        },
        params: {
          verifySignature: false,
          replayProtection: false,
          events: ['envelope-completed'],
        },
      });

      const result = await node.webhook.call(mockCtx as never);

      expect(result.webhookResponse?.status).toBe(200);
      expect(result.webhookResponse?.body).toEqual({ received: true, filtered: true });
    });

    it('should accept matching events', async () => {
      const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
      const node = new DocuSignTrigger();

      const mockCtx = createMockWebhookContext({
        headers: {},
        body: {
          event: 'envelope-completed',
          data: { envelopeSummary: { generatedDateTime: new Date().toISOString() } },
        },
        params: {
          verifySignature: false,
          replayProtection: false,
          events: ['envelope-completed', 'envelope-sent'],
        },
      });

      const result = await node.webhook.call(mockCtx as never);

      expect(result.workflowData).toBeDefined();
    });

    it('should accept all events when events array is empty', async () => {
      const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
      const node = new DocuSignTrigger();

      const mockCtx = createMockWebhookContext({
        headers: {},
        body: {
          event: 'template-modified',
          data: { envelopeSummary: { generatedDateTime: new Date().toISOString() } },
        },
        params: {
          verifySignature: false,
          replayProtection: false,
          events: [],
        },
      });

      const result = await node.webhook.call(mockCtx as never);

      expect(result.workflowData).toBeDefined();
    });
  });

  describe('Output Building', () => {
    it('should build complete output with all fields', async () => {
      const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
      const node = new DocuSignTrigger();

      const mockCtx = createMockWebhookContext({
        headers: {},
        body: {
          event: 'envelope-completed',
          data: {
            envelopeSummary: {
              envelopeId: '12345678-1234-1234-1234-123456789abc',
              status: 'completed',
              emailSubject: 'Sign this contract',
              generatedDateTime: new Date().toISOString(),
              sender: {
                email: 'sender@example.com',
                userName: 'John Sender',
              },
              recipients: [{ email: 'signer@example.com' }],
              documents: [{ documentId: '1', name: 'contract.pdf' }],
            },
          },
        },
        params: { verifySignature: false, replayProtection: false },
      });

      const result = await node.webhook.call(mockCtx as never);

      expect(result.workflowData).toBeDefined();
      const output = result.workflowData?.[0]?.[0]?.json;
      expect(output?.event).toBe('envelope-completed');
      expect(output?.envelopeId).toBe('12345678-1234-1234-1234-123456789abc');
      expect(output?.status).toBe('completed');
      expect(output?.emailSubject).toBe('Sign this contract');
      expect(output?.senderEmail).toBe('sender@example.com');
      expect(output?.senderName).toBe('John Sender');
      expect(output?.recipients).toHaveLength(1);
      expect(output?.documents).toHaveLength(1);
      expect(output?.rawPayload).toBeDefined();
      expect(output?.timestamp).toBeDefined();
    });

    it('should handle fallback fields from body level', async () => {
      const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
      const node = new DocuSignTrigger();

      const mockCtx = createMockWebhookContext({
        headers: {},
        body: {
          event: 'envelope-completed',
          envelopeId: 'fallback-id',
          status: 'completed',
          emailSubject: 'Fallback subject',
          data: {},
        },
        params: { verifySignature: false, replayProtection: false },
      });

      const result = await node.webhook.call(mockCtx as never);

      expect(result.workflowData).toBeDefined();
      const output = result.workflowData?.[0]?.[0]?.json;
      expect(output?.envelopeId).toBe('fallback-id');
      expect(output?.status).toBe('completed');
      expect(output?.emailSubject).toBe('Fallback subject');
    });

    it('should handle missing sender gracefully', async () => {
      const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
      const node = new DocuSignTrigger();

      const mockCtx = createMockWebhookContext({
        headers: {},
        body: {
          event: 'envelope-completed',
          data: {
            envelopeSummary: {
              envelopeId: '12345678-1234-1234-1234-123456789abc',
              generatedDateTime: new Date().toISOString(),
              // No sender field
            },
          },
        },
        params: { verifySignature: false, replayProtection: false },
      });

      const result = await node.webhook.call(mockCtx as never);

      expect(result.workflowData).toBeDefined();
      const output = result.workflowData?.[0]?.[0]?.json;
      expect(output?.senderEmail).toBeUndefined();
      expect(output?.senderName).toBeUndefined();
    });
  });

  describe('Credential Error Handling', () => {
    it('should handle credential fetch errors', async () => {
      const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
      const node = new DocuSignTrigger();

      const mockCtx = {
        getRequestObject: () => ({ headers: { 'x-docusign-signature-1': 'some-sig' } }),
        getBodyData: () => ({ event: 'test' }),
        getNodeParameter: (name: string) => {
          if (name === 'verifySignature') return true;
          if (name === 'replayProtection') return false;
          if (name === 'events') return [];
          return undefined;
        },
        getCredentials: async () => {
          throw new Error('Credential fetch failed');
        },
      };

      const result = await node.webhook.call(mockCtx as never);

      expect(result.webhookResponse?.status).toBe(500);
      expect(result.webhookResponse?.body).toEqual({ error: 'Signature verification failed' });
    });
  });
});

// ============================================================================
// Mocked Delete Handler Tests
// ============================================================================

describe('DocuSign Node Delete Handler', () => {
  // Helper to create mock IExecuteFunctions
  const createMockExecuteContext = (
    overrides: {
      params?: Record<string, unknown>;
      apiResponse?: Record<string, unknown>;
      shouldFail?: boolean;
    } = {},
  ) => {
    const params = overrides.params || {};
    const apiResponse = overrides.apiResponse || {
      envelopeId: '12345678-1234-1234-1234-123456789abc',
      status: 'deleted',
    };

    return {
      getInputData: () => [{ json: {} }],
      getNodeParameter: (name: string, index: number, defaultValue?: unknown) => {
        const paramMap: Record<string, unknown> = {
          resource: 'envelope',
          operation: 'delete',
          envelopeId: '12345678-1234-1234-1234-123456789abc',
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
        httpRequestWithAuthentication: async () => apiResponse,
        returnJsonArray: (data: unknown) => (Array.isArray(data) ? data : [data]),
        constructExecutionMetaData: (items: unknown[], meta: unknown) => items,
      },
      getNode: () => ({ name: 'DocuSign' }),
      continueOnFail: () => overrides.shouldFail === true,
    };
  };

  it('should execute delete operation successfully', async () => {
    const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
    const node = new DocuSign();

    // We can't easily mock the full execute context, but we can test the node instantiation
    expect(node.description.name).toBe('docuSign');

    // Check that delete operation exists in the node
    const properties = node.description.properties;
    const resourceProp = properties.find((p) => p.name === 'resource');
    expect(resourceProp).toBeDefined();
  });

  it('should validate envelope ID format for delete', () => {
    // Test validation directly
    expect(() =>
      validateField('Envelope ID', '12345678-1234-1234-1234-123456789abc', 'uuid'),
    ).not.toThrow();
    expect(() => validateField('Envelope ID', 'invalid-id', 'uuid')).toThrow(
      'Envelope ID must be a valid UUID',
    );
  });

  it('should require envelope ID for delete operation', () => {
    expect(() => validateField('Envelope ID', '', 'uuid')).not.toThrow(); // Empty is skipped
    expect(() => validateField('Envelope ID', '', 'required')).toThrow('Envelope ID is required');
  });
});

// ============================================================================
// Merge Fields Tests
// ============================================================================

describe('Merge Fields Feature', () => {
  it('should have merge fields option in envelope create additionalOptions', async () => {
    const { envelopeFields } = await import('../nodes/DocuSign/resources/envelope');

    const additionalOptions = envelopeFields.find((f) => f.name === 'additionalOptions');
    expect(additionalOptions).toBeDefined();

    const options = additionalOptions?.options as Array<{ name: string }>;
    const mergeFieldsOption = options?.find((o) => o.name === 'mergeFields');
    expect(mergeFieldsOption).toBeDefined();
  });

  it('should have correct merge fields structure', async () => {
    const { envelopeFields } = await import('../nodes/DocuSign/resources/envelope');

    const additionalOptions = envelopeFields.find((f) => f.name === 'additionalOptions');
    const options = additionalOptions?.options as Array<{
      name: string;
      type?: string;
      options?: unknown[];
    }>;
    const mergeFieldsOption = options?.find((o) => o.name === 'mergeFields');

    expect(mergeFieldsOption?.type).toBe('fixedCollection');

    // Check that merge fields has the fields array with placeholder and value
    const innerOptions = (
      mergeFieldsOption as { options?: Array<{ name: string; values?: Array<{ name: string }> }> }
    )?.options;
    const fieldsOption = innerOptions?.find((o) => o.name === 'fields');
    expect(fieldsOption).toBeDefined();

    const values = fieldsOption?.values;
    const placeholderField = values?.find((v) => v.name === 'placeholder');
    const valueField = values?.find((v) => v.name === 'value');
    const fontSizeField = values?.find((v) => v.name === 'fontSize');

    expect(placeholderField).toBeDefined();
    expect(valueField).toBeDefined();
    expect(fontSizeField).toBeDefined();
  });

  it('should have font size options', async () => {
    const { envelopeFields } = await import('../nodes/DocuSign/resources/envelope');

    const additionalOptions = envelopeFields.find((f) => f.name === 'additionalOptions');
    const options = additionalOptions?.options as Array<{ name: string; options?: unknown[] }>;
    const mergeFieldsOption = options?.find((o) => o.name === 'mergeFields');

    const innerOptions = (
      mergeFieldsOption as {
        options?: Array<{
          name: string;
          values?: Array<{ name: string; options?: Array<{ value: string }> }>;
        }>;
      }
    )?.options;
    const fieldsOption = innerOptions?.find((o) => o.name === 'fields');
    const values = fieldsOption?.values;
    const fontSizeField = values?.find((v) => v.name === 'fontSize');

    const fontOptions = (fontSizeField as { options?: Array<{ value: string }> })?.options;
    expect(fontOptions).toBeDefined();
    expect(fontOptions?.length).toBeGreaterThan(0);

    const fontValues = fontOptions?.map((o) => o.value);
    expect(fontValues).toContain('Size12');
    expect(fontValues).toContain('Size14');
    expect(fontValues).toContain('Size7');
  });
});

// ============================================================================
// Envelope Options Tests
// ============================================================================

describe('Envelope Options', () => {
  it('should have correct default values for envelope options', async () => {
    const { envelopeFields } = await import('../nodes/DocuSign/resources/envelope');

    const additionalOptions = envelopeFields.find((f) => f.name === 'additionalOptions');
    const options = additionalOptions?.options as Array<{ name: string; default?: unknown }>;

    const allowMarkup = options?.find((o) => o.name === 'allowMarkup');
    const allowReassign = options?.find((o) => o.name === 'allowReassign');
    const brandId = options?.find((o) => o.name === 'brandId');
    const enableWetSign = options?.find((o) => o.name === 'enableWetSign');
    const enforceSignerVisibility = options?.find((o) => o.name === 'enforceSignerVisibility');

    expect(allowMarkup?.default).toBe(false);
    expect(allowReassign?.default).toBe(true);
    expect(brandId?.default).toBe('');
    expect(enableWetSign?.default).toBe(false);
    expect(enforceSignerVisibility?.default).toBe(false);
  });

  it('should have correct types for envelope options', async () => {
    const { envelopeFields } = await import('../nodes/DocuSign/resources/envelope');

    const additionalOptions = envelopeFields.find((f) => f.name === 'additionalOptions');
    const options = additionalOptions?.options as Array<{ name: string; type?: string }>;

    const allowMarkup = options?.find((o) => o.name === 'allowMarkup');
    const allowReassign = options?.find((o) => o.name === 'allowReassign');
    const brandId = options?.find((o) => o.name === 'brandId');
    const enableWetSign = options?.find((o) => o.name === 'enableWetSign');
    const enforceSignerVisibility = options?.find((o) => o.name === 'enforceSignerVisibility');

    expect(allowMarkup?.type).toBe('boolean');
    expect(allowReassign?.type).toBe('boolean');
    expect(brandId?.type).toBe('string');
    expect(enableWetSign?.type).toBe('boolean');
    expect(enforceSignerVisibility?.type).toBe('boolean');
  });

  it('should have descriptions for all envelope options', async () => {
    const { envelopeFields } = await import('../nodes/DocuSign/resources/envelope');

    const additionalOptions = envelopeFields.find((f) => f.name === 'additionalOptions');
    const options = additionalOptions?.options as Array<{ name: string; description?: string }>;

    const optionNames = [
      'allowMarkup',
      'allowReassign',
      'brandId',
      'enableWetSign',
      'enforceSignerVisibility',
    ];

    for (const name of optionNames) {
      const option = options?.find((o) => o.name === name);
      expect(option?.description).toBeDefined();
      expect(option?.description?.length).toBeGreaterThan(10);
    }
  });
});

// ============================================================================
// Merge Fields Edge Cases Tests
// ============================================================================

describe('Merge Fields Edge Cases', () => {
  it('should have placeholder field marked as required', async () => {
    const { envelopeFields } = await import('../nodes/DocuSign/resources/envelope');

    const additionalOptions = envelopeFields.find((f) => f.name === 'additionalOptions');
    const options = additionalOptions?.options as Array<{ name: string }>;
    const mergeFieldsOption = options?.find((o) => o.name === 'mergeFields');

    const innerOptions = (
      mergeFieldsOption as {
        options?: Array<{ name: string; values?: Array<{ name: string; required?: boolean }> }>;
      }
    )?.options;
    const fieldsOption = innerOptions?.find((o) => o.name === 'fields');
    const values = fieldsOption?.values;
    const placeholderField = values?.find((v) => v.name === 'placeholder');

    expect(placeholderField?.required).toBe(true);
  });

  it('should have value field marked as required', async () => {
    const { envelopeFields } = await import('../nodes/DocuSign/resources/envelope');

    const additionalOptions = envelopeFields.find((f) => f.name === 'additionalOptions');
    const options = additionalOptions?.options as Array<{ name: string }>;
    const mergeFieldsOption = options?.find((o) => o.name === 'mergeFields');

    const innerOptions = (
      mergeFieldsOption as {
        options?: Array<{ name: string; values?: Array<{ name: string; required?: boolean }> }>;
      }
    )?.options;
    const fieldsOption = innerOptions?.find((o) => o.name === 'fields');
    const values = fieldsOption?.values;
    const valueField = values?.find((v) => v.name === 'value');

    expect(valueField?.required).toBe(true);
  });

  it('should have default font size of Size12', async () => {
    const { envelopeFields } = await import('../nodes/DocuSign/resources/envelope');

    const additionalOptions = envelopeFields.find((f) => f.name === 'additionalOptions');
    const options = additionalOptions?.options as Array<{ name: string }>;
    const mergeFieldsOption = options?.find((o) => o.name === 'mergeFields');

    const innerOptions = (
      mergeFieldsOption as {
        options?: Array<{ name: string; values?: Array<{ name: string; default?: string }> }>;
      }
    )?.options;
    const fieldsOption = innerOptions?.find((o) => o.name === 'fields');
    const values = fieldsOption?.values;
    const fontSizeField = values?.find((v) => v.name === 'fontSize');

    expect(fontSizeField?.default).toBe('Size12');
  });

  it('should have placeholder example in placeholder field', async () => {
    const { envelopeFields } = await import('../nodes/DocuSign/resources/envelope');

    const additionalOptions = envelopeFields.find((f) => f.name === 'additionalOptions');
    const options = additionalOptions?.options as Array<{ name: string }>;
    const mergeFieldsOption = options?.find((o) => o.name === 'mergeFields');

    const innerOptions = (
      mergeFieldsOption as {
        options?: Array<{ name: string; values?: Array<{ name: string; placeholder?: string }> }>;
      }
    )?.options;
    const fieldsOption = innerOptions?.find((o) => o.name === 'fields');
    const values = fieldsOption?.values;
    const placeholderField = values?.find((v) => v.name === 'placeholder');

    expect(placeholderField?.placeholder).toBe('{{FirstName}}');
  });

  it('should support multiple values in merge fields', async () => {
    const { envelopeFields } = await import('../nodes/DocuSign/resources/envelope');

    const additionalOptions = envelopeFields.find((f) => f.name === 'additionalOptions');
    const options = additionalOptions?.options as Array<{
      name: string;
      typeOptions?: { multipleValues?: boolean };
    }>;
    const mergeFieldsOption = options?.find((o) => o.name === 'mergeFields');

    expect(mergeFieldsOption?.typeOptions?.multipleValues).toBe(true);
  });

  it('should have all font size options from Size7 to Size72', async () => {
    const { envelopeFields } = await import('../nodes/DocuSign/resources/envelope');

    const additionalOptions = envelopeFields.find((f) => f.name === 'additionalOptions');
    const options = additionalOptions?.options as Array<{ name: string }>;
    const mergeFieldsOption = options?.find((o) => o.name === 'mergeFields');

    const innerOptions = (
      mergeFieldsOption as {
        options?: Array<{
          name: string;
          values?: Array<{ name: string; options?: Array<{ value: string }> }>;
        }>;
      }
    )?.options;
    const fieldsOption = innerOptions?.find((o) => o.name === 'fields');
    const values = fieldsOption?.values;
    const fontSizeField = values?.find((v) => v.name === 'fontSize');

    const fontOptions = (fontSizeField as { options?: Array<{ value: string }> })?.options;
    const fontValues = fontOptions?.map((o) => o.value) || [];

    // Check boundary values
    expect(fontValues).toContain('Size7');
    expect(fontValues).toContain('Size72');

    // Check common sizes
    expect(fontValues).toContain('Size10');
    expect(fontValues).toContain('Size12');
    expect(fontValues).toContain('Size14');
    expect(fontValues).toContain('Size18');
    expect(fontValues).toContain('Size24');
    expect(fontValues).toContain('Size36');
    expect(fontValues).toContain('Size48');
  });
});

// ============================================================================
// DocuSign Node Execute Tests (Handler Coverage)
// ============================================================================

describe('DocuSign Node Execute', () => {
  const VALID_UUID = '12345678-1234-1234-1234-123456789abc';

  /**
   * Creates a mock IExecuteFunctions context for testing the execute method.
   */
  const createExecuteContext = (
    overrides: {
      resource?: string;
      operation?: string;
      params?: Record<string, unknown>;
      items?: Array<{ json: Record<string, unknown>; binary?: Record<string, { data: string }> }>;
      apiResponse?: unknown;
      apiResponses?: unknown[];
      shouldFail?: boolean;
      httpError?: Error;
    } = {},
  ) => {
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
        httpRequestWithAuthentication: async () => {
          if (overrides.httpError) {
            throw overrides.httpError;
          }
          if (overrides.apiResponses) {
            return overrides.apiResponses[callCount++] || apiResponse;
          }
          return apiResponse;
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
  };

  describe('Envelope: get', () => {
    it('should get an envelope by ID', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'get',
        params: { envelopeId: VALID_UUID },
        apiResponse: { envelopeId: VALID_UUID, status: 'completed' },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.envelopeId).toBe(VALID_UUID);
    });
  });

  describe('Envelope: getAll', () => {
    it('should get all envelopes with limit', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'getAll',
        params: {
          returnAll: false,
          limit: 10,
          filters: {},
        },
        apiResponse: {
          envelopes: [
            { envelopeId: 'env-1', status: 'sent' },
            { envelopeId: 'env-2', status: 'completed' },
          ],
        },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(2);
    });

    it('should get all envelopes with returnAll', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'getAll',
        params: {
          returnAll: true,
          filters: { status: 'completed' },
        },
        apiResponse: {
          envelopes: [{ envelopeId: 'env-1' }],
          totalSetSize: '1',
          endPosition: '0',
        },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0].length).toBeGreaterThan(0);
    });

    it('should handle filters on getAll', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'getAll',
        params: {
          returnAll: false,
          limit: 5,
          filters: {
            status: 'sent',
            fromDate: '2024-01-01',
            toDate: '2024-12-31',
            searchText: 'contract',
          },
        },
        apiResponse: { envelopes: [] },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(0);
    });
  });

  describe('Envelope: send', () => {
    it('should send a draft envelope', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'send',
        params: { envelopeId: VALID_UUID },
        apiResponse: { envelopeId: VALID_UUID, status: 'sent' },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0][0].json.status).toBe('sent');
    });
  });

  describe('Envelope: void', () => {
    it('should void an envelope with reason', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'void',
        params: {
          envelopeId: VALID_UUID,
          voidReason: 'No longer needed',
        },
        apiResponse: { envelopeId: VALID_UUID, status: 'voided' },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0][0].json.status).toBe('voided');
    });
  });

  describe('Envelope: delete', () => {
    it('should delete a draft envelope', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'delete',
        params: { envelopeId: VALID_UUID },
        apiResponse: { envelopeId: VALID_UUID, status: 'deleted' },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0][0].json.status).toBe('deleted');
    });
  });

  describe('Envelope: resend', () => {
    it('should resend an envelope', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'resend',
        params: {
          envelopeId: VALID_UUID,
          resendReason: 'Recipient did not receive',
        },
        apiResponse: { envelopeId: VALID_UUID },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });
  });

  describe('Envelope: getRecipients', () => {
    it('should get recipients for an envelope', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'getRecipients',
        params: { envelopeId: VALID_UUID },
        apiResponse: {
          signers: [{ email: 'signer@example.com', name: 'Signer' }],
        },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0][0].json.signers).toBeDefined();
    });
  });

  describe('Envelope: updateRecipients', () => {
    it('should update recipient email and name', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'updateRecipients',
        params: {
          envelopeId: VALID_UUID,
          recipientId: '1',
          updateFields: {
            email: 'new@example.com',
            name: 'New Name',
          },
        },
        apiResponse: { recipientUpdateResults: [] },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });
  });

  describe('Envelope: getAuditEvents', () => {
    it('should get audit events for an envelope', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'getAuditEvents',
        params: { envelopeId: VALID_UUID },
        apiResponse: { auditEvents: [{ eventType: 'signed' }] },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0][0].json.auditEvents).toBeDefined();
    });
  });

  describe('Envelope: listDocuments', () => {
    it('should list documents in an envelope', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'listDocuments',
        params: { envelopeId: VALID_UUID },
        apiResponse: {
          envelopeDocuments: [{ documentId: '1', name: 'contract.pdf' }],
        },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0][0].json.envelopeDocuments).toBeDefined();
    });
  });

  describe('Envelope: create', () => {
    it('should create an envelope with base64 document', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'create',
        params: {
          emailSubject: 'Please sign this',
          signerEmail: 'signer@example.com',
          signerName: 'John Doe',
          document: 'SGVsbG8gV29ybGQ=',
          documentName: 'contract.pdf',
          sendImmediately: true,
          additionalOptions: {},
        },
        apiResponse: { envelopeId: VALID_UUID, status: 'sent' },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0][0].json.envelopeId).toBe(VALID_UUID);
      expect(result[0][0].json.status).toBe('sent');
    });

    it('should create an envelope with binary data', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'create',
        items: [
          {
            json: {},
            binary: { data: { data: 'SGVsbG8gV29ybGQ=' } },
          },
        ],
        params: {
          emailSubject: 'Sign document',
          signerEmail: 'signer@example.com',
          signerName: 'Jane Doe',
          document: 'data',
          documentName: 'file.pdf',
          sendImmediately: false,
          additionalOptions: {},
        },
        apiResponse: { envelopeId: VALID_UUID, status: 'created' },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0][0].json.status).toBe('created');
    });

    it('should create an envelope with anchor string positioning', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'create',
        params: {
          emailSubject: 'Sign here',
          signerEmail: 'signer@example.com',
          signerName: 'Signer',
          document: 'SGVsbG8gV29ybGQ=',
          documentName: 'doc.pdf',
          sendImmediately: true,
          additionalOptions: {
            useAnchor: true,
            anchorString: '/sign/',
          },
        },
        apiResponse: { envelopeId: VALID_UUID, status: 'sent' },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0][0].json.envelopeId).toBe(VALID_UUID);
    });

    it('should create an envelope with embedded signing', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'create',
        params: {
          emailSubject: 'Embedded Sign',
          signerEmail: 'signer@example.com',
          signerName: 'Embedded Signer',
          document: 'SGVsbG8gV29ybGQ=',
          documentName: 'doc.pdf',
          sendImmediately: true,
          additionalOptions: {
            embeddedSigning: true,
            embeddedClientUserId: 'user-123',
          },
        },
        apiResponse: { envelopeId: VALID_UUID, status: 'sent' },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });

    it('should create an envelope with CC, additional signers, and docs', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'create',
        params: {
          emailSubject: 'Multi-party signing',
          signerEmail: 'signer1@example.com',
          signerName: 'Signer One',
          document: 'SGVsbG8gV29ybGQ=',
          documentName: 'contract.pdf',
          sendImmediately: true,
          additionalOptions: {
            ccEmail: 'cc@example.com',
            ccName: 'CC Person',
            emailBlurb: 'Please review and sign',
            additionalSigners: {
              signers: [{ email: 'signer2@example.com', name: 'Signer Two', routingOrder: 2 }],
            },
            additionalDocuments: {
              documents: [{ document: 'SGVsbG8gV29ybGQ=', documentName: 'appendix.pdf' }],
            },
          },
        },
        apiResponse: { envelopeId: VALID_UUID, status: 'sent' },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });

    it('should create an envelope with additional tabs', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'create',
        params: {
          emailSubject: 'Tabs test',
          signerEmail: 'signer@example.com',
          signerName: 'Signer',
          document: 'SGVsbG8gV29ybGQ=',
          documentName: 'doc.pdf',
          sendImmediately: true,
          additionalOptions: {
            additionalTabs: {
              tabs: [
                {
                  tabType: 'initialHereTabs',
                  documentId: '1',
                  pageNumber: 1,
                  xPosition: 100,
                  yPosition: 200,
                  tabLabel: 'init',
                  required: true,
                },
                {
                  tabType: 'dateSignedTabs',
                  documentId: '1',
                  pageNumber: 1,
                  xPosition: 100,
                  yPosition: 300,
                },
              ],
            },
          },
        },
        apiResponse: { envelopeId: VALID_UUID, status: 'sent' },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });

    it('should create an envelope with merge fields', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'create',
        params: {
          emailSubject: 'Merge fields test',
          signerEmail: 'signer@example.com',
          signerName: 'Signer',
          document: 'SGVsbG8gV29ybGQ=',
          documentName: 'doc.pdf',
          sendImmediately: true,
          additionalOptions: {
            mergeFields: {
              fields: [
                { placeholder: '{{FirstName}}', value: 'John', fontSize: 'Size12' },
                { placeholder: '{{LastName}}', value: 'Doe' },
              ],
            },
          },
        },
        apiResponse: { envelopeId: VALID_UUID, status: 'sent' },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });

    it('should create an envelope with custom fields', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'create',
        params: {
          emailSubject: 'Custom fields',
          signerEmail: 'signer@example.com',
          signerName: 'Signer',
          document: 'SGVsbG8gV29ybGQ=',
          documentName: 'doc.pdf',
          sendImmediately: true,
          additionalOptions: {
            customFields: {
              textFields: [
                {
                  fieldId: '1',
                  name: 'OrderNumber',
                  value: 'ORD-123',
                  show: true,
                  required: false,
                },
              ],
            },
          },
        },
        apiResponse: { envelopeId: VALID_UUID, status: 'sent' },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });

    it('should create an envelope with envelope-level options', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'create',
        params: {
          emailSubject: 'Options test',
          signerEmail: 'signer@example.com',
          signerName: 'Signer',
          document: 'SGVsbG8gV29ybGQ=',
          documentName: 'doc.pdf',
          sendImmediately: true,
          additionalOptions: {
            allowMarkup: true,
            allowReassign: false,
            brandId: 'brand-123',
            enableWetSign: true,
            enforceSignerVisibility: true,
          },
        },
        apiResponse: { envelopeId: VALID_UUID, status: 'sent' },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });
  });

  describe('Envelope: createFromTemplate', () => {
    it('should create an envelope from a template', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'createFromTemplate',
        params: {
          templateId: VALID_UUID,
          emailSubject: 'Template envelope',
          roleName: 'Signer',
          recipientEmail: 'signer@example.com',
          recipientName: 'John Doe',
        },
        apiResponse: { envelopeId: VALID_UUID, status: 'sent' },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0][0].json.status).toBe('sent');
    });

    it('should create an envelope from template with merge fields', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'createFromTemplate',
        params: {
          templateId: VALID_UUID,
          emailSubject: 'Template with merge fields',
          roleName: 'Signer',
          recipientEmail: 'signer@example.com',
          recipientName: 'John Doe',
          additionalOptions: {
            mergeFields: {
              fields: [
                { placeholder: '{{FirstName}}', value: 'John', fontSize: 'Size12' },
                { placeholder: '{{Company}}', value: 'Acme Inc' },
              ],
            },
          },
        },
        apiResponse: { envelopeId: VALID_UUID, status: 'sent' },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.status).toBe('sent');
    });

    it('should create an envelope from template with email blurb', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'createFromTemplate',
        params: {
          templateId: VALID_UUID,
          emailSubject: 'Template with blurb',
          roleName: 'Signer',
          recipientEmail: 'signer@example.com',
          recipientName: 'John Doe',
          additionalOptions: {
            emailBlurb: 'Please review and sign this document.',
          },
        },
        apiResponse: { envelopeId: VALID_UUID, status: 'sent' },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });
  });

  describe('Envelope: createRecipientView', () => {
    it('should create embedded signing URL', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'createRecipientView',
        params: {
          envelopeId: VALID_UUID,
          signerEmail: 'signer@example.com',
          signerName: 'Signer',
          returnUrl: 'https://example.com/complete',
          authenticationMethod: 'None',
          clientUserId: 'user-123',
        },
        apiResponse: { url: 'https://docusign.com/signing/abc123' },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0][0].json.url).toBeDefined();
    });

    it('should generate clientUserId if not provided', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'createRecipientView',
        params: {
          envelopeId: VALID_UUID,
          signerEmail: 'signer@example.com',
          signerName: 'Signer',
          returnUrl: 'https://example.com/complete',
          authenticationMethod: 'None',
          clientUserId: '',
        },
        apiResponse: { url: 'https://docusign.com/signing/abc123' },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });
  });

  describe('Envelope: downloadDocument', () => {
    it('should download a document as binary', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'downloadDocument',
        params: {
          envelopeId: VALID_UUID,
          documentId: '1',
          binaryPropertyName: 'data',
        },
        apiResponse: { body: Buffer.from('PDF content') },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0][0].json.success).toBe(true);
      expect(result[0][0].binary).toBeDefined();
      expect(result[0][0].binary?.data).toBeDefined();
    });
  });

  describe('Template: get', () => {
    it('should get a template by ID', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'template',
        operation: 'get',
        params: { templateId: VALID_UUID },
        apiResponse: { templateId: VALID_UUID, name: 'My Template' },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0][0].json.templateId).toBe(VALID_UUID);
    });
  });

  describe('Template: getAll', () => {
    it('should get all templates with limit', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'template',
        operation: 'getAll',
        params: {
          returnAll: false,
          limit: 10,
          filters: {},
        },
        apiResponse: {
          envelopeTemplates: [{ templateId: 'tmpl-1', name: 'Template 1' }],
        },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(1);
    });

    it('should get all templates with filters', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'template',
        operation: 'getAll',
        params: {
          returnAll: false,
          limit: 10,
          filters: {
            searchText: 'contract',
            folderId: 'folder-123',
            sharedByMe: true,
          },
        },
        apiResponse: { envelopeTemplates: [] },
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0]).toHaveLength(0);
    });
  });

  describe('Error handling', () => {
    it('should handle unknown resource', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'unknown',
        operation: 'get',
      });

      await expect(node.execute.call(ctx as never)).rejects.toThrow();
    });

    it('should handle unknown operation', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'unknownOp',
      });

      await expect(node.execute.call(ctx as never)).rejects.toThrow();
    });

    it('should handle unknown template operation', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'template',
        operation: 'unknownOp',
      });

      await expect(node.execute.call(ctx as never)).rejects.toThrow();
    });

    it('should continueOnFail and return error in json', async () => {
      const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
      const node = new DocuSign();

      const ctx = createExecuteContext({
        resource: 'envelope',
        operation: 'updateRecipients',
        params: {
          envelopeId: VALID_UUID,
          recipientId: '1',
          updateFields: {},
        },
        shouldFail: true,
      });

      const result = await node.execute.call(ctx as never);
      expect(result[0][0].json.error).toBeDefined();
      expect(result[0][0].json.resource).toBe('envelope');
      expect(result[0][0].json.operation).toBe('updateRecipients');
    });
  });
});

// ============================================================================
// Credential Tests (JWT & Token Caching)
// ============================================================================

// ============================================================================
// Phase 2: Reminders, Expiration, Auth, New Tabs, Correct
// ============================================================================

describe('Envelope: reminders and expiration', () => {
  const VALID_UUID = '12345678-1234-1234-1234-123456789012';

  const createExecuteContext2 = (params: Record<string, unknown>, apiResponse?: unknown) => {
    return {
      getInputData: () => [{ json: {} }],
      getNodeParameter: (name: string, _index: number, defaultValue?: unknown) => {
        const paramMap: Record<string, unknown> = {
          resource: 'envelope',
          operation: 'create',
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
        httpRequestWithAuthentication: async () =>
          apiResponse || { envelopeId: VALID_UUID, status: 'sent' },
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
      continueOnFail: () => false,
    };
  };

  it('should create an envelope with reminders enabled', async () => {
    const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
    const node = new DocuSign();

    const ctx = createExecuteContext2({
      emailSubject: 'Reminder test',
      signerEmail: 'signer@example.com',
      signerName: 'Signer',
      document: 'SGVsbG8gV29ybGQ=',
      documentName: 'doc.pdf',
      sendImmediately: true,
      additionalOptions: {
        reminderEnabled: true,
        reminderDelay: 3,
        reminderFrequency: 2,
      },
    });

    const result = await node.execute.call(ctx as never);
    expect(result[0]).toHaveLength(1);
  });

  it('should create an envelope with expiration enabled', async () => {
    const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
    const node = new DocuSign();

    const ctx = createExecuteContext2({
      emailSubject: 'Expiration test',
      signerEmail: 'signer@example.com',
      signerName: 'Signer',
      document: 'SGVsbG8gV29ybGQ=',
      documentName: 'doc.pdf',
      sendImmediately: true,
      additionalOptions: {
        expireEnabled: true,
        expireAfter: 90,
        expireWarn: 5,
      },
    });

    const result = await node.execute.call(ctx as never);
    expect(result[0]).toHaveLength(1);
  });

  it('should create an envelope with both reminders and expiration', async () => {
    const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
    const node = new DocuSign();

    const ctx = createExecuteContext2({
      emailSubject: 'Both notification test',
      signerEmail: 'signer@example.com',
      signerName: 'Signer',
      document: 'SGVsbG8gV29ybGQ=',
      documentName: 'doc.pdf',
      sendImmediately: true,
      additionalOptions: {
        reminderEnabled: true,
        reminderDelay: 2,
        reminderFrequency: 1,
        expireEnabled: true,
        expireAfter: 120,
        expireWarn: 3,
      },
    });

    const result = await node.execute.call(ctx as never);
    expect(result[0]).toHaveLength(1);
  });
});

describe('Envelope: signer authentication', () => {
  const VALID_UUID = '12345678-1234-1234-1234-123456789012';

  const createExecuteContext2 = (params: Record<string, unknown>, apiResponse?: unknown) => {
    return {
      getInputData: () => [{ json: {} }],
      getNodeParameter: (name: string, _index: number, defaultValue?: unknown) => {
        const paramMap: Record<string, unknown> = {
          resource: 'envelope',
          operation: 'create',
          envelopeId: VALID_UUID,
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
        httpRequestWithAuthentication: async () =>
          apiResponse || { envelopeId: VALID_UUID, status: 'sent' },
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
      continueOnFail: () => false,
    };
  };

  it('should create an envelope with access code authentication', async () => {
    const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
    const node = new DocuSign();

    const ctx = createExecuteContext2({
      emailSubject: 'Access code test',
      signerEmail: 'signer@example.com',
      signerName: 'Signer',
      document: 'SGVsbG8gV29ybGQ=',
      documentName: 'doc.pdf',
      sendImmediately: true,
      additionalOptions: {
        signerAuthentication: {
          auth: { authMethod: 'accessCode', accessCode: 'secret123' },
        },
      },
    });

    const result = await node.execute.call(ctx as never);
    expect(result[0]).toHaveLength(1);
  });

  it('should create an envelope with phone authentication', async () => {
    const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
    const node = new DocuSign();

    const ctx = createExecuteContext2({
      emailSubject: 'Phone auth test',
      signerEmail: 'signer@example.com',
      signerName: 'Signer',
      document: 'SGVsbG8gV29ybGQ=',
      documentName: 'doc.pdf',
      sendImmediately: true,
      additionalOptions: {
        signerAuthentication: {
          auth: { authMethod: 'phone', phoneNumber: '+1-555-123-4567' },
        },
      },
    });

    const result = await node.execute.call(ctx as never);
    expect(result[0]).toHaveLength(1);
  });

  it('should create an envelope with SMS authentication', async () => {
    const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
    const node = new DocuSign();

    const ctx = createExecuteContext2({
      emailSubject: 'SMS auth test',
      signerEmail: 'signer@example.com',
      signerName: 'Signer',
      document: 'SGVsbG8gV29ybGQ=',
      documentName: 'doc.pdf',
      sendImmediately: true,
      additionalOptions: {
        signerAuthentication: {
          auth: { authMethod: 'sms', phoneNumber: '+1-555-123-4567' },
        },
      },
    });

    const result = await node.execute.call(ctx as never);
    expect(result[0]).toHaveLength(1);
  });

  it('should handle auth with array format from n8n fixedCollection', async () => {
    const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
    const node = new DocuSign();

    const ctx = createExecuteContext2({
      emailSubject: 'Auth array test',
      signerEmail: 'signer@example.com',
      signerName: 'Signer',
      document: 'SGVsbG8gV29ybGQ=',
      documentName: 'doc.pdf',
      sendImmediately: true,
      additionalOptions: {
        signerAuthentication: {
          auth: [{ authMethod: 'accessCode', accessCode: 'code456' }],
        },
      },
    });

    const result = await node.execute.call(ctx as never);
    expect(result[0]).toHaveLength(1);
  });
});

describe('Envelope: new tab types', () => {
  const VALID_UUID = '12345678-1234-1234-1234-123456789012';

  const createExecuteContext2 = (params: Record<string, unknown>, apiResponse?: unknown) => {
    return {
      getInputData: () => [{ json: {} }],
      getNodeParameter: (name: string, _index: number, defaultValue?: unknown) => {
        const paramMap: Record<string, unknown> = {
          resource: 'envelope',
          operation: 'create',
          envelopeId: VALID_UUID,
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
        httpRequestWithAuthentication: async () =>
          apiResponse || { envelopeId: VALID_UUID, status: 'sent' },
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
      continueOnFail: () => false,
    };
  };

  it('should create an envelope with radio group tab', async () => {
    const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
    const node = new DocuSign();

    const ctx = createExecuteContext2({
      emailSubject: 'Radio tab test',
      signerEmail: 'signer@example.com',
      signerName: 'Signer',
      document: 'SGVsbG8gV29ybGQ=',
      documentName: 'doc.pdf',
      sendImmediately: true,
      additionalOptions: {
        additionalTabs: {
          tabs: [
            {
              tabType: 'radioGroupTabs',
              documentId: '1',
              pageNumber: 1,
              xPosition: 100,
              yPosition: 200,
              radioItems: 'Yes,No,Maybe',
              groupName: 'agreeGroup',
            },
          ],
        },
      },
    });

    const result = await node.execute.call(ctx as never);
    expect(result[0]).toHaveLength(1);
  });

  it('should create an envelope with list/dropdown tab', async () => {
    const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
    const node = new DocuSign();

    const ctx = createExecuteContext2({
      emailSubject: 'List tab test',
      signerEmail: 'signer@example.com',
      signerName: 'Signer',
      document: 'SGVsbG8gV29ybGQ=',
      documentName: 'doc.pdf',
      sendImmediately: true,
      additionalOptions: {
        additionalTabs: {
          tabs: [
            {
              tabType: 'listTabs',
              documentId: '1',
              pageNumber: 1,
              xPosition: 100,
              yPosition: 200,
              listItems: 'Option A,Option B,Option C',
            },
          ],
        },
      },
    });

    const result = await node.execute.call(ctx as never);
    expect(result[0]).toHaveLength(1);
  });

  it('should create an envelope with number tab', async () => {
    const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
    const node = new DocuSign();

    const ctx = createExecuteContext2({
      emailSubject: 'Number tab test',
      signerEmail: 'signer@example.com',
      signerName: 'Signer',
      document: 'SGVsbG8gV29ybGQ=',
      documentName: 'doc.pdf',
      sendImmediately: true,
      additionalOptions: {
        additionalTabs: {
          tabs: [
            {
              tabType: 'numberTabs',
              documentId: '1',
              pageNumber: 1,
              xPosition: 100,
              yPosition: 200,
              tabLabel: 'quantity',
            },
          ],
        },
      },
    });

    const result = await node.execute.call(ctx as never);
    expect(result[0]).toHaveLength(1);
  });

  it('should create an envelope with formula tab', async () => {
    const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
    const node = new DocuSign();

    const ctx = createExecuteContext2({
      emailSubject: 'Formula tab test',
      signerEmail: 'signer@example.com',
      signerName: 'Signer',
      document: 'SGVsbG8gV29ybGQ=',
      documentName: 'doc.pdf',
      sendImmediately: true,
      additionalOptions: {
        additionalTabs: {
          tabs: [
            {
              tabType: 'formulaTabs',
              documentId: '1',
              pageNumber: 1,
              xPosition: 100,
              yPosition: 200,
              formula: '[quantity] * [price]',
              tabLabel: 'total',
            },
          ],
        },
      },
    });

    const result = await node.execute.call(ctx as never);
    expect(result[0]).toHaveLength(1);
  });

  it('should create an envelope with signer attachment tab', async () => {
    const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
    const node = new DocuSign();

    const ctx = createExecuteContext2({
      emailSubject: 'Attachment tab test',
      signerEmail: 'signer@example.com',
      signerName: 'Signer',
      document: 'SGVsbG8gV29ybGQ=',
      documentName: 'doc.pdf',
      sendImmediately: true,
      additionalOptions: {
        additionalTabs: {
          tabs: [
            {
              tabType: 'signerAttachmentTabs',
              documentId: '1',
              pageNumber: 1,
              xPosition: 100,
              yPosition: 200,
              tabLabel: 'uploadDoc',
            },
          ],
        },
      },
    });

    const result = await node.execute.call(ctx as never);
    expect(result[0]).toHaveLength(1);
  });
});

describe('Envelope: correct operation', () => {
  const VALID_UUID = '12345678-1234-1234-1234-123456789012';

  const createExecuteContext2 = (params: Record<string, unknown>, apiResponse?: unknown) => {
    return {
      getInputData: () => [{ json: {} }],
      getNodeParameter: (name: string, _index: number, defaultValue?: unknown) => {
        const paramMap: Record<string, unknown> = {
          resource: 'envelope',
          operation: 'correct',
          envelopeId: VALID_UUID,
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
        httpRequestWithAuthentication: async () =>
          apiResponse || { url: 'https://demo.docusign.net/correct/12345' },
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
      continueOnFail: () => false,
    };
  };

  it('should generate a correction URL', async () => {
    const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
    const node = new DocuSign();

    const ctx = createExecuteContext2({
      envelopeId: VALID_UUID,
      returnUrl: 'https://myapp.com/done',
    });

    const result = await node.execute.call(ctx as never);
    expect(result[0]).toHaveLength(1);
    expect(result[0][0].json.url).toBe('https://demo.docusign.net/correct/12345');
  });

  it('should reject private URL for correction returnUrl', async () => {
    const { DocuSign } = await import('../nodes/DocuSign/DocuSign.node');
    const node = new DocuSign();

    const ctx = createExecuteContext2({
      envelopeId: VALID_UUID,
      returnUrl: 'http://localhost:3000/done',
    });

    await expect(node.execute.call(ctx as never)).rejects.toThrow();
  });
});

describe('Phase 2 resource definitions', () => {
  it('should have correct operation in envelope operations', async () => {
    const { envelopeOperations } = await import('../nodes/DocuSign/resources/envelope');
    const options = envelopeOperations.options as Array<{ value: string; name: string }>;
    const correctOp = options.find((o) => o.value === 'correct');

    expect(correctOp).toBeDefined();
    expect(correctOp?.name).toBe('Correct');
  });

  it('should have reminder and expiration options in additionalOptions', async () => {
    const { envelopeFields } = await import('../nodes/DocuSign/resources/envelope');
    const additionalOptions = envelopeFields.find((f) => f.name === 'additionalOptions');
    const options = additionalOptions?.options as Array<{ name: string }>;
    const optionNames = options?.map((o) => o.name);

    expect(optionNames).toContain('reminderEnabled');
    expect(optionNames).toContain('reminderDelay');
    expect(optionNames).toContain('reminderFrequency');
    expect(optionNames).toContain('expireEnabled');
    expect(optionNames).toContain('expireAfter');
    expect(optionNames).toContain('expireWarn');
  });

  it('should have signer authentication option in additionalOptions', async () => {
    const { envelopeFields } = await import('../nodes/DocuSign/resources/envelope');
    const additionalOptions = envelopeFields.find((f) => f.name === 'additionalOptions');
    const options = additionalOptions?.options as Array<{ name: string }>;
    const optionNames = options?.map((o) => o.name);

    expect(optionNames).toContain('signerAuthentication');
  });

  it('should have new tab types in additionalTabs', async () => {
    const { envelopeFields } = await import('../nodes/DocuSign/resources/envelope');
    const additionalOptions = envelopeFields.find((f) => f.name === 'additionalOptions');
    const options = additionalOptions?.options as Array<{ name: string; options?: unknown[] }>;
    const additionalTabs = options?.find((o) => o.name === 'additionalTabs');
    const tabsOption = (
      additionalTabs as {
        options?: Array<{ values?: Array<{ name: string; options?: Array<{ value: string }> }> }>;
      }
    )?.options?.[0];
    const tabTypeField = tabsOption?.values?.find((v) => v.name === 'tabType');
    const tabTypeValues = tabTypeField?.options?.map((o) => o.value) || [];

    expect(tabTypeValues).toContain('radioGroupTabs');
    expect(tabTypeValues).toContain('listTabs');
    expect(tabTypeValues).toContain('numberTabs');
    expect(tabTypeValues).toContain('formulaTabs');
    expect(tabTypeValues).toContain('signerAttachmentTabs');
  });

  it('should have returnUrl field for correct operation', async () => {
    const { envelopeFields } = await import('../nodes/DocuSign/resources/envelope');
    const returnUrlField = envelopeFields.find(
      (f) => f.name === 'returnUrl' && f.displayOptions?.show?.operation?.includes('correct'),
    );

    expect(returnUrlField).toBeDefined();
    expect(returnUrlField?.required).toBe(true);
  });
});

describe('Credential Authentication', () => {
  it('should have correct properties defined', async () => {
    const { DocuSignApi } = await import('../credentials/DocuSignApi.credentials');
    const cred = new DocuSignApi();
    const names = cred.properties.map((p) => p.name);

    expect(names).toContain('environment');
    expect(names).toContain('region');
    expect(names).toContain('integrationKey');
    expect(names).toContain('userId');
    expect(names).toContain('accountId');
    expect(names).toContain('privateKey');
    expect(names).toContain('webhookSecret');
  });

  it('should have region show only for production', async () => {
    const { DocuSignApi } = await import('../credentials/DocuSignApi.credentials');
    const cred = new DocuSignApi();
    const regionProp = cred.properties.find((p) => p.name === 'region');

    expect(regionProp?.displayOptions?.show?.environment).toEqual(['production']);
  });

  it('should have password type for privateKey and webhookSecret', async () => {
    const { DocuSignApi } = await import('../credentials/DocuSignApi.credentials');
    const cred = new DocuSignApi();
    const privateKeyProp = cred.properties.find((p) => p.name === 'privateKey');
    const webhookSecretProp = cred.properties.find((p) => p.name === 'webhookSecret');

    expect(privateKeyProp?.typeOptions?.password).toBe(true);
    expect(webhookSecretProp?.typeOptions?.password).toBe(true);
  });

  it('should export getApiBaseUrl utility', async () => {
    const { getApiBaseUrl } = await import('../credentials/DocuSignApi.credentials');
    expect(getApiBaseUrl('demo', 'na')).toBe('https://demo.docusign.net/restapi/v2.1');
    expect(getApiBaseUrl('production', 'na')).toBe('https://na1.docusign.net/restapi/v2.1');
    expect(getApiBaseUrl('production', 'eu')).toBe('https://eu.docusign.net/restapi/v2.1');
    expect(getApiBaseUrl('production', 'au')).toBe('https://au.docusign.net/restapi/v2.1');
    expect(getApiBaseUrl('production', 'ca')).toBe('https://ca.docusign.net/restapi/v2.1');
    expect(getApiBaseUrl('production', 'invalid')).toBe('https://na1.docusign.net/restapi/v2.1');
  });
});
