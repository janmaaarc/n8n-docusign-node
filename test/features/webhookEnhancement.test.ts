import { describe, it, expect } from 'vitest';

describe('Webhook Trigger Enhancements', () => {
  it('should have new filter properties', async () => {
    const { DocuSignTrigger } = await import('../../nodes/DocuSign/DocuSignTrigger.node');
    const node = new DocuSignTrigger();
    const propNames = node.description.properties.map((p: { name: string }) => p.name);
    expect(propNames).toContain('filterByEnvelopeId');
    expect(propNames).toContain('filterBySenderEmail');
    expect(propNames).toContain('includeRawPayload');
  });

  it('should have new webhook events', async () => {
    const { DocuSignTrigger } = await import('../../nodes/DocuSign/DocuSignTrigger.node');
    const node = new DocuSignTrigger();
    const eventsProp = node.description.properties.find((p: { name: string }) => p.name === 'events');
    const eventValues = (eventsProp?.options as Array<{ value: string }>)?.map(o => o.value) || [];
    expect(eventValues).toContain('envelope-resent');
    expect(eventValues).toContain('envelope-corrected');
    expect(eventValues).toContain('envelope-purge');
    expect(eventValues).toContain('recipient-reassigned');
    expect(eventValues).toContain('recipient-finish-later');
  });
});
