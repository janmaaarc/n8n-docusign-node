import { describe, it, expect } from 'vitest';

describe('DocuSign OAuth2 Credential', () => {
  it('should have correct name and displayName', async () => {
    const { DocuSignOAuth2Api } = await import('../../credentials/DocuSignOAuth2Api.credentials');
    const cred = new DocuSignOAuth2Api();
    expect(cred.name).toBe('docuSignOAuth2Api');
    expect(cred.displayName).toBe('DocuSign OAuth2 API');
    expect(cred.extends).toEqual(['oAuth2Api']);
  });

  it('should have environment and region properties', async () => {
    const { DocuSignOAuth2Api } = await import('../../credentials/DocuSignOAuth2Api.credentials');
    const cred = new DocuSignOAuth2Api();
    const propNames = cred.properties.map((p: { name: string }) => p.name);
    expect(propNames).toContain('environment');
    expect(propNames).toContain('region');
    expect(propNames).toContain('accountId');
  });

  it('should have OAuth2 hidden fields', async () => {
    const { DocuSignOAuth2Api } = await import('../../credentials/DocuSignOAuth2Api.credentials');
    const cred = new DocuSignOAuth2Api();
    const propNames = cred.properties.map((p: { name: string }) => p.name);
    expect(propNames).toContain('authUrl');
    expect(propNames).toContain('accessTokenUrl');
    expect(propNames).toContain('scope');
  });

  it('should be registered in package.json', async () => {
    const pkg = await import('../../package.json');
    const creds = pkg.n8n.credentials;
    expect(creds).toContain('dist/credentials/DocuSignOAuth2Api.credentials.js');
  });
});
