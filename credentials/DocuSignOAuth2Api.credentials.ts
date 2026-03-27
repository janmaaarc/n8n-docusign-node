import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class DocuSignOAuth2Api implements ICredentialType {
  name = 'docuSignOAuth2Api';
  displayName = 'DocuSign OAuth2 API';
  documentationUrl = 'https://developers.docusign.com/platform/auth/authcode/';
  extends = ['oAuth2Api'];

  properties: INodeProperties[] = [
    {
      displayName: 'Environment',
      name: 'environment',
      type: 'options',
      options: [
        { name: 'Demo', value: 'demo' },
        { name: 'Production', value: 'production' },
      ],
      default: 'demo',
    },
    {
      displayName: 'Region',
      name: 'region',
      type: 'options',
      options: [
        { name: 'North America (NA)', value: 'na' },
        { name: 'Europe (EU)', value: 'eu' },
        { name: 'Australia (AU)', value: 'au' },
        { name: 'Canada (CA)', value: 'ca' },
      ],
      default: 'na',
      displayOptions: { show: { environment: ['production'] } },
    },
    {
      displayName: 'Account ID',
      name: 'accountId',
      type: 'string',
      default: '',
      required: true,
    },
    {
      displayName: 'Grant Type',
      name: 'grantType',
      type: 'hidden',
      default: 'authorizationCode',
    },
    {
      displayName: 'Authorization URL',
      name: 'authUrl',
      type: 'hidden',
      default:
        '={{$self.environment === "demo" ? "https://account-d.docusign.com/oauth/auth" : "https://account.docusign.com/oauth/auth"}}',
    },
    {
      displayName: 'Access Token URL',
      name: 'accessTokenUrl',
      type: 'hidden',
      default:
        '={{$self.environment === "demo" ? "https://account-d.docusign.com/oauth/token" : "https://account.docusign.com/oauth/token"}}',
    },
    {
      displayName: 'Scope',
      name: 'scope',
      type: 'hidden',
      default: 'signature',
    },
    {
      displayName: 'Authentication',
      name: 'authentication',
      type: 'hidden',
      default: 'header',
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
}
