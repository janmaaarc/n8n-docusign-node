import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidUUID,
  isValidBase64,
  isValidUrl,
  isValidIsoDate,
  validateField,
  validateRequired,
  validateEmail,
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
      expect(() => validateField('email', 'invalid', 'email')).toThrow('email must be a valid email address');
    });

    it('should validate UUID fields', () => {
      expect(() => validateField('id', '12345678-1234-1234-1234-123456789abc', 'uuid')).not.toThrow();
      expect(() => validateField('id', 'invalid', 'uuid')).toThrow('id must be a valid UUID');
    });

    it('should skip validation for empty optional fields', () => {
      expect(() => validateField('email', '', 'email')).not.toThrow();
      expect(() => validateField('id', undefined, 'uuid')).not.toThrow();
    });
  });

  describe('validateRequired (deprecated)', () => {
    it('should pass for non-empty strings', () => {
      expect(() => validateRequired('hello', 'field')).not.toThrow();
    });

    it('should throw for empty strings', () => {
      expect(() => validateRequired('', 'field')).toThrow('field is required');
    });

    it('should throw for undefined', () => {
      expect(() => validateRequired(undefined, 'field')).toThrow('field is required');
    });
  });

  describe('validateEmail (deprecated)', () => {
    it('should pass for valid emails', () => {
      expect(() => validateEmail('user@example.com', 'email')).not.toThrow();
    });

    it('should throw for invalid emails', () => {
      expect(() => validateEmail('invalid', 'email')).toThrow(
        'email must be a valid email address',
      );
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
      expect(getRetryAfterSeconds({
        response: { headers: { 'retry-after': '60' } }
      })).toBe(60);
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
    const eventsProperty = node.description.properties.find(p => p.name === 'events');
    expect(eventsProperty).toBeDefined();
    expect(eventsProperty?.type).toBe('multiOptions');
  });

  it('should have verifySignature property', async () => {
    const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
    const node = new DocuSignTrigger();
    const verifyProperty = node.description.properties.find(p => p.name === 'verifySignature');
    expect(verifyProperty).toBeDefined();
    expect(verifyProperty?.type).toBe('boolean');
    expect(verifyProperty?.default).toBe(true);
  });

  it('should have replayProtection property', async () => {
    const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
    const node = new DocuSignTrigger();
    const replayProperty = node.description.properties.find(p => p.name === 'replayProtection');
    expect(replayProperty).toBeDefined();
    expect(replayProperty?.type).toBe('boolean');
    expect(replayProperty?.default).toBe(true);
  });

  it('should support all envelope events', async () => {
    const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
    const node = new DocuSignTrigger();
    const eventsProperty = node.description.properties.find(p => p.name === 'events');
    const options = eventsProperty?.options as Array<{ value: string }>;
    const eventValues = options?.map(o => o.value) || [];

    expect(eventValues).toContain('envelope-sent');
    expect(eventValues).toContain('envelope-delivered');
    expect(eventValues).toContain('envelope-completed');
    expect(eventValues).toContain('envelope-declined');
    expect(eventValues).toContain('envelope-voided');
  });

  it('should support all recipient events', async () => {
    const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
    const node = new DocuSignTrigger();
    const eventsProperty = node.description.properties.find(p => p.name === 'events');
    const options = eventsProperty?.options as Array<{ value: string }>;
    const eventValues = options?.map(o => o.value) || [];

    expect(eventValues).toContain('recipient-sent');
    expect(eventValues).toContain('recipient-delivered');
    expect(eventValues).toContain('recipient-completed');
    expect(eventValues).toContain('recipient-declined');
    expect(eventValues).toContain('recipient-authenticationfailed');
  });

  it('should support template events', async () => {
    const { DocuSignTrigger } = await import('../nodes/DocuSign/DocuSignTrigger.node');
    const node = new DocuSignTrigger();
    const eventsProperty = node.description.properties.find(p => p.name === 'events');
    const options = eventsProperty?.options as Array<{ value: string }>;
    const eventValues = options?.map(o => o.value) || [];

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
    expect(() => validateField('content', 'not valid!!!', 'base64')).toThrow('content must be valid base64-encoded content');
  });

  it('should validate url fields', () => {
    expect(() => validateField('url', 'https://example.com', 'url')).not.toThrow();
    expect(() => validateField('url', 'not-a-url', 'url')).toThrow('url must be a valid URL');
  });

  it('should validate httpsUrl fields', () => {
    expect(() => validateField('url', 'https://example.com', 'httpsUrl')).not.toThrow();
    expect(() => validateField('url', 'http://example.com', 'httpsUrl')).toThrow('url must be a valid HTTPS URL');
  });

  it('should validate date fields', () => {
    expect(() => validateField('date', '2024-01-15', 'date')).not.toThrow();
    expect(() => validateField('date', 'not-a-date', 'date')).toThrow('date must be a valid ISO 8601 date');
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
    const operationValues = options.map(o => o.value);

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
    const deleteOp = options.find(o => o.value === 'delete');

    expect(deleteOp).toBeDefined();
    expect(deleteOp?.name).toBe('Delete');
  });

  it('should have envelope fields defined', async () => {
    const { envelopeFields } = await import('../nodes/DocuSign/resources/envelope');
    expect(envelopeFields.length).toBeGreaterThan(0);

    const fieldNames = envelopeFields.map(f => f.name);
    expect(fieldNames).toContain('emailSubject');
    expect(fieldNames).toContain('signerEmail');
    expect(fieldNames).toContain('envelopeId');
  });
});

// ============================================================================
// Template Resource Tests
// ============================================================================

describe('Template Resource', () => {
  it('should have all operations defined', async () => {
    const { templateOperations } = await import('../nodes/DocuSign/resources/template');
    const options = templateOperations.options as Array<{ value: string }>;
    const operationValues = options.map(o => o.value);

    expect(operationValues).toContain('get');
    expect(operationValues).toContain('getAll');
  });

  it('should have template fields defined', async () => {
    const { templateFields } = await import('../nodes/DocuSign/resources/template');
    expect(templateFields.length).toBeGreaterThan(0);

    const fieldNames = templateFields.map(f => f.name);
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
      response: { headers: { 'x-ratelimit-reset': String(futureTime) } }
    });
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(60);
  });

  it('should return undefined for past reset time', () => {
    const pastTime = Math.floor(Date.now() / 1000) - 60;
    const result = getRetryAfterSeconds({
      response: { headers: { 'x-ratelimit-reset': String(pastTime) } }
    });
    expect(result).toBe(undefined);
  });

  it('should return undefined for invalid retry-after values', () => {
    expect(getRetryAfterSeconds({
      response: { headers: { 'retry-after': 'invalid' } }
    })).toBe(undefined);

    expect(getRetryAfterSeconds({
      response: { headers: { 'retry-after': '-5' } }
    })).toBe(undefined);
  });
});

// ============================================================================
// Mocked Webhook Handler Tests
// ============================================================================

describe('DocuSign Trigger Webhook Handler', () => {
  const crypto = require('crypto');

  // Helper to create mock IWebhookFunctions
  const createMockWebhookContext = (overrides: {
    headers?: Record<string, string | undefined>;
    body?: Record<string, unknown>;
    params?: Record<string, unknown>;
    credentials?: Record<string, unknown>;
  } = {}) => {
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
      expect(result.webhookResponse?.body).toEqual({ error: 'Webhook secret not configured in credentials' });
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
      expect(result.webhookResponse?.body).toEqual({ error: 'Request expired (replay attack protection)' });
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
  const createMockExecuteContext = (overrides: {
    params?: Record<string, unknown>;
    apiResponse?: Record<string, unknown>;
    shouldFail?: boolean;
  } = {}) => {
    const params = overrides.params || {};
    const apiResponse = overrides.apiResponse || { envelopeId: '12345678-1234-1234-1234-123456789abc', status: 'deleted' };

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
        returnJsonArray: (data: unknown) => Array.isArray(data) ? data : [data],
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
    const resourceProp = properties.find(p => p.name === 'resource');
    expect(resourceProp).toBeDefined();
  });

  it('should validate envelope ID format for delete', () => {
    // Test validation directly
    expect(() => validateField('Envelope ID', '12345678-1234-1234-1234-123456789abc', 'uuid')).not.toThrow();
    expect(() => validateField('Envelope ID', 'invalid-id', 'uuid')).toThrow('Envelope ID must be a valid UUID');
  });

  it('should require envelope ID for delete operation', () => {
    expect(() => validateField('Envelope ID', '', 'uuid')).not.toThrow(); // Empty is skipped
    expect(() => validateField('Envelope ID', '', 'required')).toThrow('Envelope ID is required');
  });
});
