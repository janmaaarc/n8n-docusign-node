/**
 * DocuSign API Helper Functions
 *
 * This module provides utility functions for:
 * - Input validation (email, URL, UUID, base64, etc.)
 * - API request handling with retry logic
 * - Pagination support
 * - Envelope building helpers
 *
 * @module helpers
 */

import type { IExecuteFunctions, IDataObject, JsonObject, IHttpRequestMethods } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import * as crypto from 'crypto';
import { setTimeout as delay } from 'node:timers/promises';
import {
  API_BASE_URL_PRODUCTION,
  API_BASE_URL_DEMO,
  DEFAULT_REQUEST_TIMEOUT_MS,
  DEFAULT_PAGE_SIZE,
  REGION_URLS,
} from './constants';
import type { PaginationOptions } from './types';

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates email format using RFC 5322 compliant regex.
 *
 * @param email - The email address to validate
 * @returns True if the email format is valid, false otherwise
 *
 * @example
 * isValidEmail('user@example.com') // true
 * isValidEmail('invalid') // false
 */
export function isValidEmail(email: string): boolean {
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email);
}

/**
 * Validates UUID format (DocuSign IDs are UUIDs).
 *
 * @param uuid - The UUID to validate
 * @returns True if the UUID format is valid, false otherwise
 *
 * @example
 * isValidUUID('12345678-1234-1234-1234-123456789abc') // true
 * isValidUUID('invalid') // false
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validates base64 encoded string.
 *
 * @param str - The string to validate
 * @returns True if the string is valid base64, false otherwise
 *
 * @example
 * isValidBase64('SGVsbG8gV29ybGQ=') // true
 * isValidBase64('not valid base64!!!') // false
 */
export function isValidBase64(str: string): boolean {
  if (!str || str.length === 0) {
    return false;
  }
  // Check for valid base64 characters and padding
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(str)) {
    return false;
  }
  // Try to decode and re-encode to verify
  try {
    const decoded = Buffer.from(str, 'base64');
    return decoded.length > 0;
  } catch {
    return false;
  }
}

/**
 * Validates URL format and ensures it's a safe external URL.
 *
 * Security features:
 * - Only allows http:// and https:// protocols
 * - Blocks localhost and loopback addresses
 * - Blocks private network ranges (10.x, 172.16-31.x, 192.168.x)
 * - Blocks link-local addresses (169.254.x - AWS metadata endpoint)
 *
 * This prevents Server-Side Request Forgery (SSRF) attacks.
 *
 * @param url - The URL to validate
 * @param requireHttps - If true, only HTTPS URLs are allowed (default: false)
 * @returns True if the URL is valid and safe, false otherwise
 */
export function isValidUrl(url: string, requireHttps: boolean = false): boolean {
  try {
    const parsedUrl = new URL(url);

    // If HTTPS is required, reject HTTP URLs
    if (requireHttps && parsedUrl.protocol !== 'https:') {
      return false;
    }

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }

    // Block internal/private network URLs for SSRF protection
    const hostname = parsedUrl.hostname.toLowerCase();
    const blockedPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '[::1]',
      '10.',
      '172.16.',
      '172.17.',
      '172.18.',
      '172.19.',
      '172.20.',
      '172.21.',
      '172.22.',
      '172.23.',
      '172.24.',
      '172.25.',
      '172.26.',
      '172.27.',
      '172.28.',
      '172.29.',
      '172.30.',
      '172.31.',
      '192.168.',
      '169.254.',
    ];

    for (const pattern of blockedPatterns) {
      if (hostname === pattern || hostname.startsWith(pattern)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Validates ISO 8601 date format.
 *
 * @param dateString - The date string to validate
 * @returns True if the date is valid ISO 8601 format, false otherwise
 */
export function isValidIsoDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString.includes('-');
}

/**
 * Validates a field value and throws a descriptive error if invalid.
 *
 * @param fieldName - The name of the field (used in error messages)
 * @param value - The value to validate
 * @param validationType - The type of validation to perform
 * @throws Error with descriptive message if validation fails
 */
export function validateField(
  fieldName: string,
  value: unknown,
  validationType: 'email' | 'uuid' | 'base64' | 'url' | 'httpsUrl' | 'date' | 'required',
): void {
  if (validationType === 'required') {
    if (value === undefined || value === null || value === '') {
      throw new Error(`${fieldName} is required`);
    }
    return;
  }

  // Skip validation if value is empty (use 'required' for mandatory fields)
  if (value === undefined || value === null || value === '') {
    return;
  }

  switch (validationType) {
    case 'email':
      if (typeof value !== 'string' || !isValidEmail(value)) {
        throw new Error(`${fieldName} must be a valid email address`);
      }
      break;
    case 'uuid':
      if (typeof value !== 'string' || !isValidUUID(value)) {
        throw new Error(
          `${fieldName} must be a valid UUID (e.g., 12345678-1234-1234-1234-123456789abc)`,
        );
      }
      break;
    case 'base64':
      if (typeof value !== 'string' || !isValidBase64(value)) {
        throw new Error(`${fieldName} must be valid base64-encoded content`);
      }
      break;
    case 'url':
      if (typeof value !== 'string' || !isValidUrl(value)) {
        throw new Error(`${fieldName} must be a valid URL`);
      }
      break;
    case 'httpsUrl':
      if (typeof value !== 'string' || !isValidUrl(value, true)) {
        throw new Error(`${fieldName} must be a valid HTTPS URL`);
      }
      break;
    case 'date':
      if (typeof value !== 'string' || !isValidIsoDate(value)) {
        throw new Error(`${fieldName} must be a valid ISO 8601 date`);
      }
      break;
  }
}

/**
 * Extracts file extension from filename, with proper fallback.
 *
 * @param filename - The filename to extract extension from
 * @param defaultExtension - Default extension if none found (default: 'pdf')
 * @returns The file extension without the dot
 *
 * @example
 * getFileExtension('document.pdf') // 'pdf'
 * getFileExtension('contract.docx') // 'docx'
 * getFileExtension('noextension') // 'pdf'
 */
export function getFileExtension(filename: string, defaultExtension: string = 'pdf'): string {
  const parts = filename.split('.');
  if (parts.length > 1) {
    return parts.pop() || defaultExtension;
  }
  return defaultExtension;
}

// ============================================================================
// Rate Limiting Helpers
// ============================================================================

/**
 * Checks if an error is a rate limit error (HTTP 429).
 *
 * @param error - The error object to check
 * @returns True if the error is a rate limit error, false otherwise
 */
export function isRateLimitError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const err = error as { statusCode?: number; response?: { statusCode?: number } };
    return err.statusCode === 429 || err.response?.statusCode === 429;
  }
  return false;
}

/**
 * Checks if an error is retryable (5xx server errors or network errors).
 *
 * @param error - The error object to check
 * @returns True if the error is retryable, false otherwise
 */
export function isRetryableError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const err = error as { statusCode?: number; response?: { statusCode?: number }; code?: string };
    const statusCode = err.statusCode || err.response?.statusCode;
    if (statusCode && statusCode >= 500 && statusCode < 600) {
      return true;
    }
    if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
      return true;
    }
  }
  return false;
}

/**
 * Extracts the Retry-After header value from an error response.
 *
 * @param error - The error object that may contain Retry-After header
 * @returns Number of seconds to wait, or undefined if not present
 */
export function getRetryAfterSeconds(error: unknown): number | undefined {
  if (error && typeof error === 'object') {
    const err = error as {
      response?: {
        headers?: { 'retry-after'?: string; 'x-ratelimit-reset'?: string };
      };
    };
    // Try standard Retry-After header
    const retryAfter = err.response?.headers?.['retry-after'];
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds) && seconds > 0) {
        return seconds;
      }
    }
    // Try DocuSign's rate limit reset header
    const rateLimitReset = err.response?.headers?.['x-ratelimit-reset'];
    if (rateLimitReset) {
      const resetTime = parseInt(rateLimitReset, 10);
      if (!isNaN(resetTime)) {
        const now = Math.floor(Date.now() / 1000);
        const waitSeconds = resetTime - now;
        if (waitSeconds > 0) {
          return waitSeconds;
        }
      }
    }
  }
  return undefined;
}

// ============================================================================
// API Request Helpers
// ============================================================================

/**
 * Gets the base URL based on environment and region.
 *
 * @param environment - 'production' or 'demo'
 * @param region - Region code ('na', 'eu', 'au', 'ca') - only used for production
 * @returns The API base URL
 */
export function getBaseUrl(environment: string, region?: string): string {
  if (environment === 'demo') {
    return API_BASE_URL_DEMO;
  }
  if (region && REGION_URLS[region]) {
    return REGION_URLS[region];
  }
  return API_BASE_URL_PRODUCTION;
}

// ============================================================================
// Webhook Helpers
// ============================================================================

/**
 * Verifies a DocuSign Connect webhook signature using HMAC-SHA256.
 *
 * DocuSign Connect uses HMAC-SHA256 to sign webhook payloads.
 * The signature is sent in the X-DocuSign-Signature-1 header.
 *
 * @param payload - The raw webhook payload string
 * @param signature - The signature from X-DocuSign-Signature-1 header
 * @param secret - The HMAC secret key configured in DocuSign Connect
 * @returns True if signature is valid, false otherwise
 *
 * @example
 * const isValid = verifyWebhookSignature(
 *   '{"event": "envelope-completed"}',
 *   'abc123signature',
 *   'webhook_secret_key'
 * )
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  if (!payload || !signature || !secret) {
    return false;
  }

  try {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(payload).digest('base64');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
}

/**
 * DocuSign API error codes and their meanings
 */
const ERROR_MESSAGES: Record<number, string> = {
  400: 'Bad Request: The request was invalid or malformed',
  401: 'Unauthorized: Invalid or missing credentials. Check your API keys.',
  403: 'Forbidden: You do not have permission to access this resource',
  404: 'Not Found: The requested resource does not exist',
  409: 'Conflict: The resource already exists or there is a conflict',
  422: 'Unprocessable Entity: The request data is invalid',
  429: 'Rate Limited: Too many requests. Please wait before retrying',
  500: 'Internal Server Error: Something went wrong on DocuSign servers',
  502: 'Bad Gateway: DocuSign is temporarily unavailable',
  503: 'Service Unavailable: DocuSign is temporarily unavailable',
};

/**
 * Extract detailed error message from error object.
 * Sanitizes error messages to avoid leaking sensitive information.
 */
function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const err = error as {
      message?: string;
      statusCode?: number;
      response?: {
        statusCode?: number;
        body?: {
          errorCode?: string;
          message?: string;
        };
      };
    };

    const statusCode = err.statusCode || err.response?.statusCode;

    // Check for DocuSign error format
    if (err.response?.body?.message) {
      const errorCode = err.response.body.errorCode || '';
      // Sanitize: don't include raw error text that might contain tokens
      const safeMessage = err.response.body.message.substring(0, 200);
      return errorCode ? `${errorCode}: ${safeMessage}` : safeMessage;
    }

    // Use status code mapping
    if (statusCode && ERROR_MESSAGES[statusCode]) {
      return ERROR_MESSAGES[statusCode];
    }

    // For generic messages, limit length to avoid leaking sensitive data
    if (err.message) {
      // Filter out any message that might contain token or key data
      if (
        err.message.toLowerCase().includes('token') ||
        err.message.toLowerCase().includes('key') ||
        err.message.toLowerCase().includes('secret')
      ) {
        return 'Authentication failed. Please check your credentials.';
      }
      return err.message.substring(0, 200);
    }
  }

  return 'An unknown error occurred';
}

/** Maximum number of retry attempts */
const MAX_RETRIES = 3;

/** Base delay for exponential backoff in milliseconds */
const BASE_RETRY_DELAY_MS = 1000;

/**
 * Makes an authenticated request to the DocuSign API with retry logic.
 *
 * Features:
 * - Automatic authentication using stored credentials
 * - Rate limit handling with automatic retry after delay
 * - Exponential backoff for server errors (5xx)
 * - Configurable request timeout
 *
 * @param this - The n8n execution context
 * @param method - HTTP method
 * @param endpoint - API endpoint path (without base URL)
 * @param body - Optional request body
 * @param qs - Optional query string parameters
 * @param timeout - Request timeout in milliseconds
 * @returns The API response data
 * @throws NodeApiError if the request fails after all retries
 */
export async function docuSignApiRequest(
  this: IExecuteFunctions,
  method: IHttpRequestMethods,
  endpoint: string,
  body?: IDataObject,
  qs: Record<string, string | number> = {},
  timeout: number = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<IDataObject> {
  const credentials = await this.getCredentials('docuSignApi');
  const environment = credentials.environment as string;
  const region = (credentials.region as string) || 'na';
  const accountId = credentials.accountId as string;
  const baseUrl = getBaseUrl(environment, region);

  // Build full URL with account ID
  const url = `${baseUrl}/accounts/${accountId}${endpoint}`;

  const options: {
    method: IHttpRequestMethods;
    url: string;
    qs: Record<string, string | number>;
    body?: IDataObject;
    json: boolean;
    timeout: number;
  } = {
    method,
    url,
    qs,
    json: true,
    timeout,
  };

  if (body && Object.keys(body).length > 0) {
    options.body = body;
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return (await this.helpers.httpRequestWithAuthentication.call(
        this,
        'docuSignApi',
        options,
      )) as IDataObject;
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx except 429)
      const statusCode =
        (error as { statusCode?: number }).statusCode ||
        (error as { response?: { statusCode?: number } }).response?.statusCode;
      if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
        break;
      }

      // Handle rate limiting
      if (isRateLimitError(error)) {
        const retryAfter = getRetryAfterSeconds(error) || 60;
        if (attempt < MAX_RETRIES) {
          await delay(retryAfter * 1000);
          continue;
        }
      }

      // Handle retryable errors with exponential backoff
      if (isRetryableError(error) && attempt < MAX_RETRIES) {
        const backoff = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        await delay(backoff);
        continue;
      }

      break;
    }
  }

  throw new NodeApiError(this.getNode(), lastError as JsonObject, {
    message: getErrorMessage(lastError),
  });
}

/**
 * Makes paginated requests to fetch all items from a DocuSign API endpoint.
 *
 * Automatically handles pagination by following 'nextUri' links until all items
 * are retrieved.
 *
 * @param this - The n8n execution context
 * @param method - HTTP method (typically 'GET')
 * @param endpoint - API endpoint path
 * @param resourceKey - Key in response containing the array (e.g., 'envelopes', 'envelopeTemplates')
 * @param qs - Optional query string parameters
 * @param paginationOptions - Optional pagination configuration
 * @returns Array of all items from all pages
 */
export async function docuSignApiRequestAllItems(
  this: IExecuteFunctions,
  method: IHttpRequestMethods,
  endpoint: string,
  resourceKey: string,
  qs: Record<string, string | number> = {},
  paginationOptions: PaginationOptions = {},
): Promise<IDataObject[]> {
  const returnData: IDataObject[] = [];
  const { maxItems, timeout = 300000, pageSize = DEFAULT_PAGE_SIZE } = paginationOptions;
  const startTime = Date.now();

  // Set initial page size
  qs.count = pageSize;
  let startPosition = 0;

  do {
    // Check timeout
    if (timeout > 0 && Date.now() - startTime > timeout) {
      throw new NodeApiError(this.getNode(), {} as JsonObject, {
        message: `Pagination timeout exceeded (${timeout}ms). Retrieved ${returnData.length} items before timeout.`,
      });
    }

    qs.start_position = startPosition;

    const response = await docuSignApiRequest.call(this, method, endpoint, undefined, qs);

    const items = (response[resourceKey] as IDataObject[]) || [];
    returnData.push(...items);

    // Check maxItems limit
    if (maxItems && returnData.length >= maxItems) {
      return returnData.slice(0, maxItems);
    }

    // Check if there are more pages
    const totalSetSize = parseInt(String(response.totalSetSize), 10);
    const endPosition = parseInt(String(response.endPosition), 10);

    if (isNaN(totalSetSize) || isNaN(endPosition) || endPosition >= totalSetSize - 1) {
      break;
    }

    startPosition = endPosition + 1;
    // eslint-disable-next-line no-constant-condition
  } while (true);

  return returnData;
}

// ============================================================================
// Envelope Building Helpers
// ============================================================================

/**
 * Builds a signer object for the envelope.
 *
 * @param email - Signer's email
 * @param name - Signer's name
 * @param recipientId - Unique recipient ID
 * @param routingOrder - Order in signing workflow
 * @returns Signer object
 */
export function buildSigner(
  email: string,
  name: string,
  recipientId: string,
  routingOrder: string = '1',
): IDataObject {
  validateField('Signer email', email, 'email');
  validateField('Signer name', name, 'required');

  return {
    email,
    name,
    recipientId,
    routingOrder,
  };
}

/**
 * Builds a carbon copy recipient object.
 *
 * @param email - Recipient's email
 * @param name - Recipient's name
 * @param recipientId - Unique recipient ID
 * @param routingOrder - Order in signing workflow
 * @returns Carbon copy object
 */
export function buildCarbonCopy(
  email: string,
  name: string,
  recipientId: string,
  routingOrder: string = '1',
): IDataObject {
  validateField('CC email', email, 'email');
  validateField('CC name', name, 'required');

  return {
    email,
    name,
    recipientId,
    routingOrder,
  };
}

/**
 * Builds a document object for the envelope.
 *
 * @param documentBase64 - Base64 encoded document content
 * @param documentId - Unique document ID
 * @param name - Document name
 * @param fileExtension - File extension (pdf, docx, etc.)
 * @returns Document object
 */
export function buildDocument(
  documentBase64: string,
  documentId: string,
  name: string,
  fileExtension: string = 'pdf',
): IDataObject {
  validateField('Document content', documentBase64, 'required');
  validateField('Document name', name, 'required');

  return {
    documentBase64,
    documentId,
    name,
    fileExtension,
  };
}

/**
 * Builds a signature tab (field) object.
 *
 * @param documentId - ID of the document
 * @param pageNumber - Page number for the tab
 * @param options - Position options (x/y or anchor)
 * @returns Tab object
 */
export function buildSignHereTab(
  documentId: string,
  pageNumber: string,
  options: {
    xPosition?: string;
    yPosition?: string;
    anchorString?: string;
    anchorXOffset?: string;
    anchorYOffset?: string;
  } = {},
): IDataObject {
  const tab: IDataObject = {
    documentId,
    pageNumber,
  };

  if (options.anchorString) {
    tab.anchorString = options.anchorString;
    if (options.anchorXOffset) {
      tab.anchorXOffset = options.anchorXOffset;
    }
    if (options.anchorYOffset) {
      tab.anchorYOffset = options.anchorYOffset;
    }
  } else {
    tab.xPosition = options.xPosition || '100';
    tab.yPosition = options.yPosition || '100';
  }

  return tab;
}

/**
 * Builds a template role for sending from a template.
 *
 * @param email - Recipient's email
 * @param name - Recipient's name
 * @param roleName - The role name defined in the template
 * @returns Template role object
 */
export function buildTemplateRole(email: string, name: string, roleName: string): IDataObject {
  validateField('Recipient email', email, 'email');
  validateField('Recipient name', name, 'required');
  validateField('Role name', roleName, 'required');

  return {
    email,
    name,
    roleName,
  };
}
