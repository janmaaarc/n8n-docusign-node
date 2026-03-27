import type {
  ICredentialDataDecryptedObject,
  ICredentialTestRequest,
  ICredentialType,
  IHttpRequestOptions,
  INodeProperties,
} from 'n8n-workflow';

/**
 * Token cache entry with expiration tracking
 */
interface TokenCacheEntry {
  accessToken: string;
  expiresAt: number;
}

/**
 * In-memory token cache keyed by integration key + user ID
 * Tokens are cached until 5 minutes before expiration
 */
const tokenCache = new Map<string, TokenCacheEntry>();

/** Buffer time before token expiration to refresh (5 minutes) */
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/**
 * DocuSign regional API base URLs
 */
const REGION_URLS: Record<string, { api: string; auth: string; authDemo: string }> = {
  na: {
    api: 'https://na1.docusign.net/restapi/v2.1',
    auth: 'account.docusign.com',
    authDemo: 'account-d.docusign.com',
  },
  eu: {
    api: 'https://eu.docusign.net/restapi/v2.1',
    auth: 'account.docusign.com',
    authDemo: 'account-d.docusign.com',
  },
  au: {
    api: 'https://au.docusign.net/restapi/v2.1',
    auth: 'account.docusign.com',
    authDemo: 'account-d.docusign.com',
  },
  ca: {
    api: 'https://ca.docusign.net/restapi/v2.1',
    auth: 'account.docusign.com',
    authDemo: 'account-d.docusign.com',
  },
  demo: {
    api: 'https://demo.docusign.net/restapi/v2.1',
    auth: 'account-d.docusign.com',
    authDemo: 'account-d.docusign.com',
  },
};

export class DocuSignApi implements ICredentialType {
  name = 'docuSignApi';
  displayName = 'DocuSign API';
  icon = 'file:docusign.svg' as const;
  documentationUrl = 'https://developers.docusign.com/docs/esign-rest-api/';
  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.environment === "demo" ? "https://demo.docusign.net/restapi/v2.1" : "https://" + ($credentials.region || "na1") + ".docusign.net/restapi/v2.1"}}',
      url: '=/accounts/{{$credentials.accountId}}',
    },
  };

  properties: INodeProperties[] = [
    {
      displayName: 'Environment',
      name: 'environment',
      type: 'options',
      options: [
        {
          name: 'Demo/Sandbox',
          value: 'demo',
        },
        {
          name: 'Production',
          value: 'production',
        },
      ],
      default: 'demo',
      description: 'Choose between production or demo/sandbox environment',
    },
    {
      displayName: 'Region',
      name: 'region',
      type: 'options',
      options: [
        {
          name: 'North America (NA)',
          value: 'na',
        },
        {
          name: 'Europe (EU)',
          value: 'eu',
        },
        {
          name: 'Australia (AU)',
          value: 'au',
        },
        {
          name: 'Canada (CA)',
          value: 'ca',
        },
      ],
      default: 'na',
      description: 'Select your DocuSign account region',
      displayOptions: {
        show: {
          environment: ['production'],
        },
      },
    },
    {
      displayName: 'Integration Key (Client ID)',
      name: 'integrationKey',
      type: 'string',
      default: '',
      required: true,
      description:
        'Your DocuSign Integration Key. Found in Settings > Apps and Keys in your DocuSign admin.',
    },
    {
      displayName: 'User ID',
      name: 'userId',
      type: 'string',
      default: '',
      required: true,
      description:
        'The User ID (GUID) to impersonate. Found in Settings > Apps and Keys under your user info.',
    },
    {
      displayName: 'Account ID',
      name: 'accountId',
      type: 'string',
      default: '',
      required: true,
      description:
        'Your DocuSign Account ID. Found in Settings > Apps and Keys under API Account ID.',
    },
    {
      displayName: 'Private Key',
      name: 'privateKey',
      type: 'string',
      typeOptions: {
        password: true,
        rows: 10,
      },
      default: '',
      required: true,
      description:
        'RSA Private Key for JWT authentication. Include the -----BEGIN RSA PRIVATE KEY----- and -----END RSA PRIVATE KEY----- lines.',
    },
    {
      displayName: 'Webhook Secret',
      name: 'webhookSecret',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description:
        'HMAC secret key for webhook signature verification. Generate using: openssl rand -hex 32',
    },
  ];

  async authenticate(
    credentials: ICredentialDataDecryptedObject,
    requestOptions: IHttpRequestOptions,
  ): Promise<IHttpRequestOptions> {
    const environment = credentials.environment as string;
    const region = (credentials.region as string) || 'na';
    const integrationKey = credentials.integrationKey as string;
    const userId = credentials.userId as string;
    const privateKey = credentials.privateKey as string;

    // Determine the auth server based on environment
    const regionConfig = environment === 'production' ? REGION_URLS[region] : REGION_URLS.demo;
    const authServer = environment === 'production' ? regionConfig.auth : regionConfig.authDemo;

    // Get access token (from cache or fresh)
    const accessToken = await this.getOrRefreshAccessToken(
      integrationKey,
      userId,
      privateKey,
      authServer,
    );

    // Add authorization header
    requestOptions.headers = {
      ...requestOptions.headers,
      Authorization: `Bearer ${accessToken}`,
    };

    return requestOptions;
  }

  /**
   * Gets a cached access token or generates a new one if expired/missing.
   */
  private async getOrRefreshAccessToken(
    integrationKey: string,
    userId: string,
    privateKey: string,
    authServer: string,
  ): Promise<string> {
    const cacheKey = `${integrationKey}:${userId}:${authServer}`;
    const cached = tokenCache.get(cacheKey);

    // Return cached token if still valid (with buffer)
    if (cached && cached.expiresAt > Date.now() + TOKEN_EXPIRY_BUFFER_MS) {
      return cached.accessToken;
    }

    // Generate new JWT and exchange for access token
    const jwt = await this.generateJWT(integrationKey, userId, privateKey, authServer);
    const { accessToken, expiresIn } = await this.getAccessToken(authServer, jwt);

    // Cache the token with expiration time
    tokenCache.set(cacheKey, {
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
    });

    return accessToken;
  }

  private async generateJWT(
    integrationKey: string,
    userId: string,
    privateKey: string,
    authServer: string,
  ): Promise<string> {
    const crypto = await import('crypto');

    const header = {
      typ: 'JWT',
      alg: 'RS256',
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: integrationKey,
      sub: userId,
      aud: authServer,
      iat: now,
      exp: now + 3600, // 1 hour expiration
      scope: 'signature impersonation',
    };

    const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signatureInput = `${headerBase64}.${payloadBase64}`;

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(privateKey, 'base64url');

    return `${signatureInput}.${signature}`;
  }

  private async getAccessToken(
    authServer: string,
    jwt: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const response = await fetch(`https://${authServer}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      // Sanitize error message to avoid leaking sensitive info
      let errorMessage = 'DocuSign authentication failed';
      try {
        const errorData = (await response.json()) as { error?: string; error_description?: string };
        if (errorData.error_description) {
          // Only include safe error descriptions
          const safeErrors = ['consent_required', 'invalid_grant', 'invalid_request'];
          if (safeErrors.some((e) => errorData.error_description?.includes(e))) {
            errorMessage = `DocuSign authentication failed: ${errorData.error_description}`;
          }
        }
      } catch {
        // Ignore JSON parse errors
      }
      throw new Error(errorMessage);
    }

    let data: { access_token?: string; expires_in?: number };
    try {
      data = (await response.json()) as { access_token?: string; expires_in?: number };
    } catch {
      throw new Error('DocuSign returned invalid response format');
    }

    if (!data.access_token) {
      throw new Error('DocuSign response missing access token');
    }

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 3600, // Default to 1 hour if not provided
    };
  }
}

/**
 * Get the API base URL for the given credentials
 */
export function getApiBaseUrl(environment: string, region: string): string {
  if (environment === 'demo') {
    return REGION_URLS.demo.api;
  }
  return REGION_URLS[region]?.api || REGION_URLS.na.api;
}
