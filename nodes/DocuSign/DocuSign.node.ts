import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IDataObject,
  IBinaryData,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import {
  docuSignApiRequest,
  docuSignApiRequestAllItems,
  validateField,
  buildSigner,
  buildCarbonCopy,
  buildDocument,
  buildSignHereTab,
  buildTemplateRole,
  getFileExtension,
  getBaseUrl,
  isValidBase64,
} from './helpers';
import { resourceProperty, allOperations, allFields } from './resources';
import { DEFAULT_SIGNATURE_X, DEFAULT_SIGNATURE_Y } from './constants';

// ============================================================================
// Envelope Handlers
// ============================================================================

/**
 * Handles envelope creation with document upload.
 * Supports multiple signers and documents.
 */
async function handleEnvelopeCreate(
  ctx: IExecuteFunctions,
  items: INodeExecutionData[],
  itemIndex: number,
): Promise<IDataObject> {
  const emailSubject = ctx.getNodeParameter('emailSubject', itemIndex) as string;
  const signerEmail = ctx.getNodeParameter('signerEmail', itemIndex) as string;
  const signerName = ctx.getNodeParameter('signerName', itemIndex) as string;
  const documentInput = ctx.getNodeParameter('document', itemIndex) as string;
  const documentName = ctx.getNodeParameter('documentName', itemIndex) as string;
  const sendImmediately = ctx.getNodeParameter('sendImmediately', itemIndex) as boolean;
  const additionalOptions = ctx.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

  // Validate inputs
  validateField('Email Subject', emailSubject, 'required');
  validateField('Signer Email', signerEmail, 'email');
  validateField('Signer Name', signerName, 'required');

  // Get primary document content
  const binaryData = items[itemIndex].binary;
  const getDocumentBase64 = (input: string): string => {
    if (binaryData && binaryData[input]) {
      return binaryData[input].data;
    }
    if (!isValidBase64(input)) {
      throw new Error('Document must be valid base64-encoded content or a binary property name');
    }
    return input;
  };

  const documentBase64 = getDocumentBase64(documentInput);

  // Build primary signer with signature tab
  const signer = buildSigner(signerEmail, signerName, '1', '1');

  // Add clientUserId for embedded signing if enabled
  if (additionalOptions.embeddedSigning) {
    const clientUserId =
      (additionalOptions.embeddedClientUserId as string) ||
      `embedded-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    signer.clientUserId = clientUserId;
  }

  // Add signature tab
  const signaturePage = (additionalOptions.signaturePage as number) || 1;
  let signHereTab: IDataObject;

  if (additionalOptions.useAnchor) {
    signHereTab = buildSignHereTab('1', signaturePage.toString(), {
      anchorString: additionalOptions.anchorString as string,
      anchorXOffset: '0',
      anchorYOffset: '0',
    });
  } else {
    signHereTab = buildSignHereTab('1', signaturePage.toString(), {
      xPosition: ((additionalOptions.signatureX as number) || DEFAULT_SIGNATURE_X).toString(),
      yPosition: ((additionalOptions.signatureY as number) || DEFAULT_SIGNATURE_Y).toString(),
    });
  }

  // Initialize tabs with signHere
  const signerTabs: IDataObject = {
    signHereTabs: [signHereTab],
  };

  // Add additional tabs if specified
  const additionalTabsData = additionalOptions.additionalTabs as IDataObject | undefined;
  if (additionalTabsData?.tabs) {
    const tabsList = additionalTabsData.tabs as IDataObject[];
    for (const tab of tabsList) {
      const tabType = tab.tabType as string;

      // Handle radioGroupTabs specially — different structure
      if (tabType === 'radioGroupTabs') {
        const radioItems = ((tab.radioItems as string) || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const radioTab: IDataObject = {
          documentId: (tab.documentId as string) || '1',
          groupName: (tab.groupName as string) || 'radioGroup',
          radios: radioItems.map((item, idx) => ({
            pageNumber: String(tab.pageNumber || 1),
            xPosition: String(Number(tab.xPosition || 100)),
            yPosition: String(Number(tab.yPosition || 150) + idx * 25),
            value: item,
            selected: 'false',
          })),
        };
        if (!signerTabs.radioGroupTabs) {
          signerTabs.radioGroupTabs = [];
        }
        (signerTabs.radioGroupTabs as IDataObject[]).push(radioTab);
        continue;
      }

      const tabObj: IDataObject = {
        documentId: (tab.documentId as string) || '1',
        pageNumber: String(tab.pageNumber || 1),
        xPosition: String(tab.xPosition || 100),
        yPosition: String(tab.yPosition || 150),
      };

      if (tab.tabLabel) {
        tabObj.tabLabel = tab.tabLabel as string;
      }
      if (tab.required) {
        tabObj.required = 'true';
      }

      // Handle listTabs — parse comma-separated items
      if (tabType === 'listTabs') {
        const items = ((tab.listItems as string) || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        tabObj.listItems = items.map((item, idx) => ({
          text: item,
          value: item.toLowerCase().replace(/\s+/g, '_'),
          selected: idx === 0 ? 'true' : 'false',
        }));
      }

      // Handle formulaTabs — add formula expression
      if (tabType === 'formulaTabs') {
        tabObj.formula = tab.formula as string;
        tabObj.locked = 'true';
      }

      if (!signerTabs[tabType]) {
        signerTabs[tabType] = [];
      }
      (signerTabs[tabType] as IDataObject[]).push(tabObj);
    }
  }

  // Add merge fields (converted to textTabs with anchor strings)
  const mergeFieldsData = additionalOptions.mergeFields as IDataObject | undefined;
  if (mergeFieldsData?.fields) {
    const fieldsList = mergeFieldsData.fields as IDataObject[];
    if (!signerTabs.textTabs) {
      signerTabs.textTabs = [];
    }

    for (const field of fieldsList) {
      const placeholder = field.placeholder as string;
      const value = field.value as string;
      const fontSize = (field.fontSize as string) || 'Size12';

      if (placeholder && value !== undefined) {
        const textTab: IDataObject = {
          anchorString: placeholder,
          anchorUnits: 'pixels',
          anchorXOffset: '0',
          anchorYOffset: '0',
          value,
          fontSize,
          locked: 'true',
          tabLabel: `merge_${placeholder}`,
        };
        (signerTabs.textTabs as IDataObject[]).push(textTab);
      }
    }
  }

  signer.tabs = signerTabs;

  // Build primary document with proper file extension extraction
  const fileExtension = getFileExtension(documentName);
  const primaryDocument = buildDocument(documentBase64, '1', documentName, fileExtension);
  const documents: IDataObject[] = [primaryDocument];

  // Add additional documents
  const additionalDocs = additionalOptions.additionalDocuments as IDataObject | undefined;
  if (additionalDocs?.documents) {
    const docsList = additionalDocs.documents as IDataObject[];
    let docId = 2;
    for (const doc of docsList) {
      const docContent = getDocumentBase64(doc.document as string);
      const docName = doc.documentName as string;
      validateField('Additional Document Name', docName, 'required');
      const ext = getFileExtension(docName);
      documents.push(buildDocument(docContent, docId.toString(), docName, ext));
      docId++;
    }
  }

  // Build signers array
  const signers: IDataObject[] = [signer];

  // Add additional signers
  const additionalSigners = additionalOptions.additionalSigners as IDataObject | undefined;
  if (additionalSigners?.signers) {
    const signersList = additionalSigners.signers as IDataObject[];
    let signerId = 2;
    for (const addSigner of signersList) {
      validateField('Additional Signer Email', addSigner.email as string, 'email');
      validateField('Additional Signer Name', addSigner.name as string, 'required');

      const routingOrder = (addSigner.routingOrder as number) || signerId;
      const newSigner = buildSigner(
        addSigner.email as string,
        addSigner.name as string,
        signerId.toString(),
        routingOrder.toString(),
      );

      // Add signature tab for each document
      const tabs: IDataObject[] = [];
      for (let i = 0; i < documents.length; i++) {
        tabs.push(
          buildSignHereTab((i + 1).toString(), '1', {
            xPosition: DEFAULT_SIGNATURE_X.toString(),
            yPosition: (DEFAULT_SIGNATURE_Y + (signerId - 1) * 50).toString(),
          }),
        );
      }
      newSigner.tabs = { signHereTabs: tabs };

      signers.push(newSigner);
      signerId++;
    }
  }

  // Build recipients
  const recipients: IDataObject = {
    signers,
  };

  // Add CC if provided
  if (additionalOptions.ccEmail && additionalOptions.ccName) {
    validateField('CC Email', additionalOptions.ccEmail as string, 'email');
    const ccRecipientId = (signers.length + 1).toString();
    const cc = buildCarbonCopy(
      additionalOptions.ccEmail as string,
      additionalOptions.ccName as string,
      ccRecipientId,
      ccRecipientId,
    );
    recipients.carbonCopies = [cc];
  }

  // Build envelope
  const envelope: IDataObject = {
    emailSubject,
    documents,
    recipients,
    status: sendImmediately ? 'sent' : 'created',
  };

  if (additionalOptions.emailBlurb) {
    envelope.emailBlurb = additionalOptions.emailBlurb;
  }

  // Add envelope-level options
  if (additionalOptions.allowMarkup !== undefined) {
    envelope.allowMarkup = additionalOptions.allowMarkup ? 'true' : 'false';
  }
  if (additionalOptions.allowReassign !== undefined) {
    envelope.allowReassign = additionalOptions.allowReassign ? 'true' : 'false';
  }
  if (additionalOptions.brandId) {
    envelope.brandId = additionalOptions.brandId;
  }
  if (additionalOptions.enableWetSign !== undefined) {
    envelope.enableWetSign = additionalOptions.enableWetSign ? 'true' : 'false';
  }
  if (additionalOptions.enforceSignerVisibility !== undefined) {
    envelope.enforceSignerVisibility = additionalOptions.enforceSignerVisibility ? 'true' : 'false';
  }

  // Add notification settings (reminders and expiration)
  if (additionalOptions.reminderEnabled || additionalOptions.expireEnabled) {
    const notification: IDataObject = { useAccountDefaults: 'false' };
    if (additionalOptions.reminderEnabled) {
      notification.reminders = {
        reminderEnabled: 'true',
        reminderDelay: String(additionalOptions.reminderDelay || 2),
        reminderFrequency: String(additionalOptions.reminderFrequency || 1),
      };
    }
    if (additionalOptions.expireEnabled) {
      notification.expirations = {
        expireEnabled: 'true',
        expireAfter: String(additionalOptions.expireAfter || 120),
        expireWarn: String(additionalOptions.expireWarn || 3),
      };
    }
    envelope.notification = notification;
  }

  // Add signer authentication if specified
  const signerAuth = additionalOptions.signerAuthentication as IDataObject | undefined;
  if (signerAuth?.auth) {
    const authData = Array.isArray(signerAuth.auth)
      ? (signerAuth.auth as IDataObject[])[0]
      : (signerAuth.auth as IDataObject);
    if (authData) {
      const method = authData.authMethod as string;
      if (method === 'accessCode') {
        signer.accessCode = authData.accessCode as string;
      } else if (method === 'phone') {
        signer.phoneAuthentication = {
          recipMayProvideNumber: 'true',
          senderProvidedNumbers: [authData.phoneNumber as string],
        };
      } else if (method === 'sms') {
        signer.smsAuthentication = {
          senderProvidedNumbers: [authData.phoneNumber as string],
        };
      }
    }
  }

  // Add custom fields if specified
  const customFieldsData = additionalOptions.customFields as IDataObject | undefined;
  if (customFieldsData?.textFields) {
    const textFieldsList = customFieldsData.textFields as IDataObject[];
    const textCustomFields: IDataObject[] = [];

    for (const field of textFieldsList) {
      textCustomFields.push({
        fieldId: field.fieldId as string,
        name: field.name as string,
        value: (field.value as string) || '',
        show: field.show ? 'true' : 'false',
        required: field.required ? 'true' : 'false',
      });
    }

    envelope.customFields = {
      textCustomFields,
    };
  }

  return await docuSignApiRequest.call(ctx, 'POST', '/envelopes', envelope);
}

/**
 * Handles envelope creation from a template.
 */
async function handleEnvelopeCreateFromTemplate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  const emailSubject = ctx.getNodeParameter('emailSubject', itemIndex) as string;
  const roleName = ctx.getNodeParameter('roleName', itemIndex) as string;
  const recipientEmail = ctx.getNodeParameter('recipientEmail', itemIndex) as string;
  const recipientName = ctx.getNodeParameter('recipientName', itemIndex) as string;

  // Validate inputs
  validateField('Template ID', templateId, 'uuid');
  validateField('Email Subject', emailSubject, 'required');
  validateField('Recipient Email', recipientEmail, 'email');
  validateField('Recipient Name', recipientName, 'required');

  const templateRole = buildTemplateRole(recipientEmail, recipientName, roleName);
  const additionalOptions = ctx.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

  // Add merge fields as textTabs on the template role
  const mergeFieldsData = additionalOptions.mergeFields as IDataObject | undefined;
  if (mergeFieldsData?.fields) {
    const fieldsList = mergeFieldsData.fields as IDataObject[];
    const textTabs: IDataObject[] = [];

    for (const field of fieldsList) {
      const placeholder = field.placeholder as string;
      const value = field.value as string;
      const fontSize = (field.fontSize as string) || 'Size12';

      if (placeholder && value !== undefined) {
        textTabs.push({
          anchorString: placeholder,
          anchorUnits: 'pixels',
          anchorXOffset: '0',
          anchorYOffset: '0',
          value,
          fontSize,
          locked: 'true',
          tabLabel: `merge_${placeholder}`,
        });
      }
    }

    if (textTabs.length > 0) {
      templateRole.tabs = { textTabs };
    }
  }

  const envelope: IDataObject = {
    templateId,
    emailSubject,
    templateRoles: [templateRole],
    status: 'sent',
  };

  if (additionalOptions.emailBlurb) {
    envelope.emailBlurb = additionalOptions.emailBlurb;
  }

  return await docuSignApiRequest.call(ctx, 'POST', '/envelopes', envelope);
}

/**
 * Handles getting a single envelope.
 */
async function handleEnvelopeGet(ctx: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;

  validateField('Envelope ID', envelopeId, 'uuid');

  return await docuSignApiRequest.call(ctx, 'GET', `/envelopes/${envelopeId}`);
}

/**
 * Handles getting all envelopes with pagination.
 */
async function handleEnvelopeGetAll(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject[]> {
  const returnAll = ctx.getNodeParameter('returnAll', itemIndex) as boolean;
  const filters = ctx.getNodeParameter('filters', itemIndex, {});
  const qs: Record<string, string | number> = {};

  // Add filters
  if (filters.status) {
    qs.status = filters.status as string;
  }
  if (filters.fromDate) {
    validateField('From Date', filters.fromDate as string, 'date');
    qs.from_date = filters.fromDate as string;
  }
  if (filters.toDate) {
    validateField('To Date', filters.toDate as string, 'date');
    qs.to_date = filters.toDate as string;
  }
  if (filters.searchText) {
    qs.search_text = filters.searchText as string;
  }

  if (returnAll) {
    return await docuSignApiRequestAllItems.call(ctx, 'GET', '/envelopes', 'envelopes', qs);
  }

  const limit = ctx.getNodeParameter('limit', itemIndex);
  qs.count = limit;

  const response = await docuSignApiRequest.call(ctx, 'GET', '/envelopes', undefined, qs);
  return (response.envelopes as IDataObject[]) || [];
}

/**
 * Handles sending a draft envelope.
 */
async function handleEnvelopeSend(ctx: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;

  validateField('Envelope ID', envelopeId, 'uuid');

  return await docuSignApiRequest.call(ctx, 'PUT', `/envelopes/${envelopeId}`, { status: 'sent' });
}

/**
 * Handles voiding an envelope.
 */
async function handleEnvelopeVoid(ctx: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const voidReason = ctx.getNodeParameter('voidReason', itemIndex) as string;

  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Void Reason', voidReason, 'required');

  return await docuSignApiRequest.call(ctx, 'PUT', `/envelopes/${envelopeId}`, {
    status: 'voided',
    voidedReason: voidReason,
  });
}

/**
 * Handles downloading a document from an envelope.
 */
async function handleEnvelopeDownloadDocument(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<{ binary: IBinaryData; envelopeId: string; documentId: string }> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const documentId = ctx.getNodeParameter('documentId', itemIndex) as string;

  validateField('Envelope ID', envelopeId, 'uuid');
  // documentId can be 'combined', 'archive', 'certificate', or a number - validate if it looks like a UUID
  if (documentId.includes('-')) {
    validateField('Document ID', documentId, 'uuid');
  }

  const credentials = await ctx.getCredentials('docuSignApi');
  const environment = credentials.environment as string;
  const region = (credentials.region as string) || 'na';
  const accountId = credentials.accountId as string;
  const baseUrl = getBaseUrl(environment, region);

  const response = (await ctx.helpers.httpRequestWithAuthentication.call(ctx, 'docuSignApi', {
    method: 'GET',
    url: `${baseUrl}/accounts/${accountId}/envelopes/${envelopeId}/documents/${documentId}`,
    encoding: 'arraybuffer',
    returnFullResponse: true,
  })) as { body: Buffer };

  const binaryData: IBinaryData = await ctx.helpers.prepareBinaryData(
    Buffer.from(response.body),
    `document_${envelopeId}_${documentId}.pdf`,
    'application/pdf',
  );

  return { binary: binaryData, envelopeId, documentId };
}

/**
 * Handles resending an envelope to recipients.
 */
async function handleEnvelopeResend(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const resendReason = ctx.getNodeParameter('resendReason', itemIndex, '') as string;

  validateField('Envelope ID', envelopeId, 'uuid');

  const body: IDataObject = {};
  if (resendReason) {
    body.resendEnvelopeReason = resendReason;
  }

  return await docuSignApiRequest.call(
    ctx,
    'PUT',
    `/envelopes/${envelopeId}?resend_envelope=true`,
    body,
  );
}

/**
 * Handles getting recipients for an envelope.
 */
async function handleEnvelopeGetRecipients(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;

  validateField('Envelope ID', envelopeId, 'uuid');

  return await docuSignApiRequest.call(ctx, 'GET', `/envelopes/${envelopeId}/recipients`);
}

/**
 * Handles updating recipients for an envelope.
 */
async function handleEnvelopeUpdateRecipients(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const recipientId = ctx.getNodeParameter('recipientId', itemIndex) as string;
  const updateFields = ctx.getNodeParameter('updateFields', itemIndex, {});

  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Recipient ID', recipientId, 'required');

  if (!updateFields.email && !updateFields.name) {
    throw new Error('At least one update field (email or name) is required');
  }

  if (updateFields.email) {
    validateField('Email', updateFields.email as string, 'email');
  }

  const signer: IDataObject = {
    recipientId,
  };

  if (updateFields.email) {
    signer.email = updateFields.email;
  }
  if (updateFields.name) {
    signer.name = updateFields.name;
  }

  const body: IDataObject = {
    signers: [signer],
  };

  return await docuSignApiRequest.call(ctx, 'PUT', `/envelopes/${envelopeId}/recipients`, body);
}

/**
 * Handles getting audit events for an envelope.
 */
async function handleEnvelopeGetAuditEvents(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;

  validateField('Envelope ID', envelopeId, 'uuid');

  return await docuSignApiRequest.call(ctx, 'GET', `/envelopes/${envelopeId}/audit_events`);
}

/**
 * Handles deleting a draft envelope.
 * Only works for envelopes with status "created" (draft).
 */
async function handleEnvelopeDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;

  validateField('Envelope ID', envelopeId, 'uuid');

  // DocuSign uses PUT with status "deleted" to delete draft envelopes
  return await docuSignApiRequest.call(ctx, 'PUT', `/envelopes/${envelopeId}`, {
    status: 'deleted',
  });
}

/**
 * Handles creating an embedded signing URL (recipient view).
 * Returns a URL that can be used in an iframe or redirect for signing.
 */
async function handleEnvelopeCreateRecipientView(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const signerEmail = ctx.getNodeParameter('signerEmail', itemIndex) as string;
  const signerName = ctx.getNodeParameter('signerName', itemIndex) as string;
  const returnUrl = ctx.getNodeParameter('returnUrl', itemIndex) as string;
  const authenticationMethod = ctx.getNodeParameter(
    'authenticationMethod',
    itemIndex,
    'None',
  ) as string;
  const clientUserId = ctx.getNodeParameter('clientUserId', itemIndex, '') as string;

  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Signer Email', signerEmail, 'email');
  validateField('Signer Name', signerName, 'required');
  validateField('Return URL', returnUrl, 'url');

  const body: IDataObject = {
    email: signerEmail,
    userName: signerName,
    returnUrl,
    authenticationMethod,
  };

  // clientUserId is required for embedded signing
  if (clientUserId) {
    body.clientUserId = clientUserId;
  } else {
    // Generate a unique client user ID if not provided
    body.clientUserId = `embedded-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  return await docuSignApiRequest.call(
    ctx,
    'POST',
    `/envelopes/${envelopeId}/views/recipient`,
    body,
  );
}

/**
 * Handles listing documents in an envelope.
 */
async function handleEnvelopeListDocuments(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;

  validateField('Envelope ID', envelopeId, 'uuid');

  return await docuSignApiRequest.call(ctx, 'GET', `/envelopes/${envelopeId}/documents`);
}

/**
 * Handles generating a correction URL for a sent envelope.
 */
async function handleEnvelopeCorrect(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const returnUrl = ctx.getNodeParameter('returnUrl', itemIndex) as string;

  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Return URL', returnUrl, 'url');

  return await docuSignApiRequest.call(ctx, 'POST', `/envelopes/${envelopeId}/views/correct`, {
    returnUrl,
  });
}

// ============================================================================
// Template Handlers
// ============================================================================

/**
 * Handles getting a single template.
 */
async function handleTemplateGet(ctx: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;

  validateField('Template ID', templateId, 'uuid');

  return await docuSignApiRequest.call(ctx, 'GET', `/templates/${templateId}`);
}

/**
 * Handles getting all templates with pagination.
 */
async function handleTemplateGetAll(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject[]> {
  const returnAll = ctx.getNodeParameter('returnAll', itemIndex) as boolean;
  const filters = ctx.getNodeParameter('filters', itemIndex, {});
  const qs: Record<string, string | number> = {};

  // Add filters
  if (filters.searchText) {
    qs.search_text = filters.searchText as string;
  }
  if (filters.folderId) {
    qs.folder_ids = filters.folderId as string;
  }
  if (filters.sharedByMe) {
    qs.shared_by_me = 'true';
  }

  if (returnAll) {
    return await docuSignApiRequestAllItems.call(ctx, 'GET', '/templates', 'envelopeTemplates', qs);
  }

  const limit = ctx.getNodeParameter('limit', itemIndex);
  qs.count = limit;

  const response = await docuSignApiRequest.call(ctx, 'GET', '/templates', undefined, qs);
  return (response.envelopeTemplates as IDataObject[]) || [];
}

// ============================================================================
// Main Node Class
// ============================================================================

export class DocuSign implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'DocuSign',
    name: 'docuSign',
    icon: 'file:docusign.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Send documents for eSignature and manage envelopes with DocuSign',
    defaults: {
      name: 'DocuSign',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'docuSignApi',
        required: true,
      },
    ],
    properties: [resourceProperty, ...allOperations, ...allFields],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const resource = this.getNodeParameter('resource', 0);
    const operation = this.getNodeParameter('operation', 0);

    for (let i = 0; i < items.length; i++) {
      try {
        let responseData: IDataObject | IDataObject[] | undefined;

        // ==========================================================================
        // Envelope Resource
        // ==========================================================================
        if (resource === 'envelope') {
          switch (operation) {
            case 'create':
              responseData = await handleEnvelopeCreate(this, items, i);
              break;

            case 'createFromTemplate':
              responseData = await handleEnvelopeCreateFromTemplate(this, i);
              break;

            case 'get':
              responseData = await handleEnvelopeGet(this, i);
              break;

            case 'getAll':
              responseData = await handleEnvelopeGetAll(this, i);
              break;

            case 'send':
              responseData = await handleEnvelopeSend(this, i);
              break;

            case 'void':
              responseData = await handleEnvelopeVoid(this, i);
              break;

            case 'downloadDocument': {
              const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
              const result = await handleEnvelopeDownloadDocument(this, i);

              returnData.push({
                json: {
                  envelopeId: result.envelopeId,
                  documentId: result.documentId,
                  success: true,
                },
                binary: { [binaryPropertyName]: result.binary },
                pairedItem: { item: i },
              });
              continue;
            }

            case 'resend':
              responseData = await handleEnvelopeResend(this, i);
              break;

            case 'getRecipients':
              responseData = await handleEnvelopeGetRecipients(this, i);
              break;

            case 'updateRecipients':
              responseData = await handleEnvelopeUpdateRecipients(this, i);
              break;

            case 'getAuditEvents':
              responseData = await handleEnvelopeGetAuditEvents(this, i);
              break;

            case 'delete':
              responseData = await handleEnvelopeDelete(this, i);
              break;

            case 'createRecipientView':
              responseData = await handleEnvelopeCreateRecipientView(this, i);
              break;

            case 'listDocuments':
              responseData = await handleEnvelopeListDocuments(this, i);
              break;

            case 'correct':
              responseData = await handleEnvelopeCorrect(this, i);
              break;

            default:
              throw new NodeApiError(
                this.getNode(),
                {},
                {
                  message: `Unknown operation: ${operation}`,
                },
              );
          }
        }

        // ==========================================================================
        // Template Resource
        // ==========================================================================
        else if (resource === 'template') {
          switch (operation) {
            case 'get':
              responseData = await handleTemplateGet(this, i);
              break;

            case 'getAll':
              responseData = await handleTemplateGetAll(this, i);
              break;

            default:
              throw new NodeApiError(
                this.getNode(),
                {},
                {
                  message: `Unknown operation: ${operation}`,
                },
              );
          }
        } else {
          throw new NodeApiError(
            this.getNode(),
            {},
            {
              message: `Unknown resource: ${resource}`,
            },
          );
        }

        const executionData = this.helpers.constructExecutionMetaData(
          this.helpers.returnJsonArray(responseData as IDataObject[]),
          { itemData: { item: i } },
        );
        returnData.push(...executionData);
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: (error as Error).message,
              resource,
              operation,
            },
            pairedItem: { item: i },
          });
          continue;
        }
        // Add context to error
        if (error instanceof NodeApiError) {
          throw error;
        }
        throw new NodeApiError(
          this.getNode(),
          { message: (error as Error).message },
          {
            message: `Failed to ${operation} ${resource}: ${(error as Error).message}`,
          },
        );
      }
    }

    return [returnData];
  }
}
