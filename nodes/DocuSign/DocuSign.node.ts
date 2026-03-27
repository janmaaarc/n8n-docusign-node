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
  resolveDocumentBase64,
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
  const documentBase64 = resolveDocumentBase64(items, itemIndex, documentInput);

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
      const docContent = resolveDocumentBase64(items, itemIndex, doc.document as string);
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

  // Add SMS delivery notification if specified
  const smsDeliveryData = additionalOptions.smsDelivery as IDataObject | undefined;
  if (smsDeliveryData?.sms) {
    const smsData = Array.isArray(smsDeliveryData.sms)
      ? (smsDeliveryData.sms as IDataObject[])[0]
      : (smsDeliveryData.sms as IDataObject);
    if (smsData && smsData.phoneNumber) {
      validateField('SMS Phone Number', smsData.phoneNumber as string, 'required');
      signer.additionalNotifications = [
        {
          secondaryDeliveryMethod: 'SMS',
          phoneNumber: {
            countryCode: (smsData.countryCode as string) || '1',
            number: smsData.phoneNumber as string,
          },
        },
      ];
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

  const authType = ctx.getNodeParameter('authentication', 0, 'jwt') as string;
  const credentialName = authType === 'oauth2' ? 'docuSignOAuth2Api' : 'docuSignApi';
  const credentials = await ctx.getCredentials(credentialName);
  const environment = credentials.environment as string;
  const region = (credentials.region as string) || 'na';
  const accountId = credentials.accountId as string;
  const baseUrl = getBaseUrl(environment, region);

  const response = (await ctx.helpers.httpRequestWithAuthentication.call(ctx, credentialName, {
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
 * Handles creating a new template with documents.
 */
async function handleTemplateCreate(
  ctx: IExecuteFunctions,
  items: INodeExecutionData[],
  itemIndex: number,
): Promise<IDataObject> {
  const emailSubject = ctx.getNodeParameter('emailSubject', itemIndex) as string;
  const documentInput = ctx.getNodeParameter('document', itemIndex) as string;
  const documentName = ctx.getNodeParameter('documentName', itemIndex) as string;
  const description = ctx.getNodeParameter('description', itemIndex, '') as string;
  const additionalOptions = ctx.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

  validateField('Email Subject', emailSubject, 'required');
  validateField('Document Name', documentName, 'required');

  const documentBase64 = resolveDocumentBase64(items, itemIndex, documentInput);
  const fileExtension = getFileExtension(documentName);
  const document = buildDocument(documentBase64, '1', documentName, fileExtension);

  const roleName = (additionalOptions.roleName as string) || 'Signer';

  const template: IDataObject = {
    emailSubject,
    documents: [document],
    recipients: {
      signers: [
        {
          recipientId: '1',
          routingOrder: '1',
          roleName,
          tabs: {
            signHereTabs: [
              buildSignHereTab('1', '1', {
                xPosition: DEFAULT_SIGNATURE_X.toString(),
                yPosition: DEFAULT_SIGNATURE_Y.toString(),
              }),
            ],
          },
        },
      ],
    },
  };

  if (description) {
    template.description = description;
  }
  if (additionalOptions.emailBlurb) {
    template.emailBlurb = additionalOptions.emailBlurb;
  }

  return await docuSignApiRequest.call(ctx, 'POST', '/templates', template);
}

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

/**
 * Handles updating a template.
 */
async function handleTemplateUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  const updateFields = ctx.getNodeParameter('updateFields', itemIndex, {});

  validateField('Template ID', templateId, 'uuid');

  if (!updateFields.emailSubject && !updateFields.description && !updateFields.name) {
    throw new Error('At least one update field is required');
  }

  const body: IDataObject = {};
  if (updateFields.emailSubject) {
    body.emailSubject = updateFields.emailSubject;
  }
  if (updateFields.description) {
    body.description = updateFields.description;
  }
  if (updateFields.name) {
    body.name = updateFields.name;
  }

  return await docuSignApiRequest.call(ctx, 'PUT', `/templates/${templateId}`, body);
}

/**
 * Handles deleting a template.
 */
async function handleTemplateDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;

  validateField('Template ID', templateId, 'uuid');

  return await docuSignApiRequest.call(ctx, 'DELETE', `/templates/${templateId}`);
}

// ============================================================================
// Bulk Send Handlers
// ============================================================================

/**
 * Handles creating a bulk send list.
 */
async function handleBulkSendCreateList(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const listName = ctx.getNodeParameter('listName', itemIndex) as string;
  const recipientsData = ctx.getNodeParameter('recipients', itemIndex, {}) as IDataObject;

  validateField('List Name', listName, 'required');

  const bulkCopies: IDataObject[] = [];
  if (recipientsData.recipient) {
    const recipients = recipientsData.recipient as IDataObject[];
    for (const r of recipients) {
      validateField('Recipient Email', r.email as string, 'email');
      validateField('Recipient Name', r.name as string, 'required');
      bulkCopies.push({
        recipients: {
          signers: [
            {
              email: r.email,
              name: r.name,
              roleName: (r.roleName as string) || 'Signer',
            },
          ],
        },
      });
    }
  }

  return await docuSignApiRequest.call(ctx, 'POST', '/bulk_send_lists', {
    name: listName,
    bulkCopies,
  });
}

/**
 * Handles getting a bulk send list.
 */
async function handleBulkSendGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const listId = ctx.getNodeParameter('listId', itemIndex) as string;

  validateField('List ID', listId, 'uuid');

  return await docuSignApiRequest.call(ctx, 'GET', `/bulk_send_lists/${listId}`);
}

/**
 * Handles getting all bulk send lists.
 */
async function handleBulkSendGetAll(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject[]> {
  const returnAll = ctx.getNodeParameter('returnAll', itemIndex) as boolean;

  if (returnAll) {
    return await docuSignApiRequestAllItems.call(
      ctx,
      'GET',
      '/bulk_send_lists',
      'bulkSendLists',
      {},
    );
  }

  const limit = ctx.getNodeParameter('limit', itemIndex);
  const response = await docuSignApiRequest.call(ctx, 'GET', '/bulk_send_lists', undefined, {
    count: limit,
  });
  return (response.bulkSendLists as IDataObject[]) || [];
}

/**
 * Handles deleting a bulk send list.
 */
async function handleBulkSendDeleteList(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const listId = ctx.getNodeParameter('listId', itemIndex) as string;

  validateField('List ID', listId, 'uuid');

  return await docuSignApiRequest.call(ctx, 'DELETE', `/bulk_send_lists/${listId}`);
}

/**
 * Handles sending bulk envelopes.
 */
async function handleBulkSendSend(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const listId = ctx.getNodeParameter('listId', itemIndex) as string;
  const envelopeOrTemplateId = ctx.getNodeParameter(
    'envelopeOrTemplateId',
    itemIndex,
  ) as string;

  validateField('List ID', listId, 'uuid');
  validateField('Envelope/Template ID', envelopeOrTemplateId, 'uuid');

  return await docuSignApiRequest.call(ctx, 'POST', `/bulk_send_lists/${listId}/send`, {
    envelopeOrTemplateId,
  });
}

/**
 * Handles getting bulk send batch status.
 */
async function handleBulkSendGetBatchStatus(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const listId = ctx.getNodeParameter('listId', itemIndex) as string;
  const batchId = ctx.getNodeParameter('batchId', itemIndex) as string;

  validateField('List ID', listId, 'uuid');
  validateField('Batch ID', batchId, 'uuid');

  return await docuSignApiRequest.call(
    ctx,
    'GET',
    `/bulk_send_lists/${listId}/batches/${batchId}`,
  );
}

// ============================================================================
// PowerForm Handlers
// ============================================================================

/**
 * Handles creating a PowerForm.
 */
async function handlePowerFormCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  const name = ctx.getNodeParameter('name', itemIndex) as string;
  const additionalOptions = ctx.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

  validateField('Template ID', templateId, 'uuid');
  validateField('Name', name, 'required');

  const body: IDataObject = { templateId, name };

  if (additionalOptions.emailSubject) {
    body.emailSubject = additionalOptions.emailSubject;
  }
  if (additionalOptions.emailBody) {
    body.emailBody = additionalOptions.emailBody;
  }
  if (additionalOptions.signerCanSignOnMobile !== undefined) {
    body.signerCanSignOnMobile = additionalOptions.signerCanSignOnMobile ? 'true' : 'false';
  }
  if (additionalOptions.maxUse) {
    body.maxUse = String(additionalOptions.maxUse);
  }

  return await docuSignApiRequest.call(ctx, 'POST', '/powerforms', body);
}

/**
 * Handles getting a single PowerForm.
 */
async function handlePowerFormGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const powerFormId = ctx.getNodeParameter('powerFormId', itemIndex) as string;

  validateField('PowerForm ID', powerFormId, 'uuid');

  return await docuSignApiRequest.call(ctx, 'GET', `/powerforms/${powerFormId}`);
}

/**
 * Handles getting all PowerForms.
 */
async function handlePowerFormGetAll(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject[]> {
  const returnAll = ctx.getNodeParameter('returnAll', itemIndex) as boolean;

  if (returnAll) {
    return await docuSignApiRequestAllItems.call(ctx, 'GET', '/powerforms', 'powerForms', {});
  }

  const limit = ctx.getNodeParameter('limit', itemIndex);
  const response = await docuSignApiRequest.call(ctx, 'GET', '/powerforms', undefined, {
    count: limit,
  });
  return (response.powerForms as IDataObject[]) || [];
}

/**
 * Handles deleting a PowerForm.
 */
async function handlePowerFormDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const powerFormId = ctx.getNodeParameter('powerFormId', itemIndex) as string;

  validateField('PowerForm ID', powerFormId, 'uuid');

  return await docuSignApiRequest.call(ctx, 'DELETE', `/powerforms/${powerFormId}`);
}

// ============================================================================
// Folder Handlers
// ============================================================================

/**
 * Handles getting all folders.
 */
async function handleFolderGetAll(ctx: IExecuteFunctions): Promise<IDataObject> {
  return await docuSignApiRequest.call(ctx, 'GET', '/folders');
}

/**
 * Handles getting items in a folder.
 */
async function handleFolderGetItems(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject[]> {
  const folderId = ctx.getNodeParameter('folderId', itemIndex) as string;
  const returnAll = ctx.getNodeParameter('returnAll', itemIndex) as boolean;

  validateField('Folder ID', folderId, 'required');

  if (returnAll) {
    return await docuSignApiRequestAllItems.call(
      ctx,
      'GET',
      `/folders/${folderId}`,
      'folderItems',
      {},
    );
  }

  const limit = ctx.getNodeParameter('limit', itemIndex);
  const response = await docuSignApiRequest.call(ctx, 'GET', `/folders/${folderId}`, undefined, {
    count: limit,
  });
  return (response.folderItems as IDataObject[]) || [];
}

/**
 * Handles moving envelopes to a folder.
 */
async function handleFolderMoveEnvelope(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const folderId = ctx.getNodeParameter('folderId', itemIndex) as string;
  const envelopeIdsStr = ctx.getNodeParameter('envelopeIds', itemIndex) as string;

  validateField('Folder ID', folderId, 'required');
  validateField('Envelope IDs', envelopeIdsStr, 'required');

  const envelopeIds = envelopeIdsStr
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  for (const id of envelopeIds) {
    validateField('Envelope ID', id, 'uuid');
  }

  return await docuSignApiRequest.call(ctx, 'PUT', `/folders/${folderId}`, {
    envelopeIds: envelopeIds.map((envelopeId) => ({ envelopeId })),
  });
}

/**
 * Handles searching folders for envelopes.
 */
async function handleFolderSearch(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject[]> {
  const searchFolderId = ctx.getNodeParameter('searchFolderId', itemIndex) as string;
  const returnAll = ctx.getNodeParameter('returnAll', itemIndex) as boolean;
  const filters = ctx.getNodeParameter('filters', itemIndex, {});
  const qs: Record<string, string | number> = {};

  validateField('Search Folder ID', searchFolderId, 'required');

  if (filters.searchText) {
    qs.search_text = filters.searchText as string;
  }
  if (filters.fromDate) {
    validateField('From Date', filters.fromDate as string, 'date');
    qs.from_date = filters.fromDate as string;
  }
  if (filters.toDate) {
    validateField('To Date', filters.toDate as string, 'date');
    qs.to_date = filters.toDate as string;
  }
  if (filters.status) {
    qs.status = filters.status as string;
  }

  if (returnAll) {
    return await docuSignApiRequestAllItems.call(
      ctx,
      'GET',
      `/search_folders/${searchFolderId}`,
      'folderItems',
      qs,
    );
  }

  const limit = ctx.getNodeParameter('limit', itemIndex);
  qs.count = limit;
  const response = await docuSignApiRequest.call(
    ctx,
    'GET',
    `/search_folders/${searchFolderId}`,
    undefined,
    qs,
  );
  return (response.folderItems as IDataObject[]) || [];
}

// ============================================================================
// Envelope Lock Handlers
// ============================================================================

/**
 * Handles locking an envelope for editing.
 */
async function handleEnvelopeLockCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const lockDurationInSeconds = ctx.getNodeParameter('lockDurationInSeconds', itemIndex) as number;
  const lockedByApp = ctx.getNodeParameter('lockedByApp', itemIndex, 'n8n') as string;

  validateField('Envelope ID', envelopeId, 'uuid');

  return await docuSignApiRequest.call(ctx, 'POST', `/envelopes/${envelopeId}/lock`, {
    lockDurationInSeconds: String(lockDurationInSeconds),
    lockedByApp,
    lockType: 'edit',
  });
}

/**
 * Handles getting lock information for an envelope.
 */
async function handleEnvelopeLockGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;

  validateField('Envelope ID', envelopeId, 'uuid');

  return await docuSignApiRequest.call(ctx, 'GET', `/envelopes/${envelopeId}/lock`);
}

/**
 * Handles updating an existing envelope lock.
 */
async function handleEnvelopeLockUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const lockToken = ctx.getNodeParameter('lockToken', itemIndex) as string;
  const lockDurationInSeconds = ctx.getNodeParameter(
    'lockDurationInSeconds',
    itemIndex,
    300,
  ) as number;

  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Lock Token', lockToken, 'required');

  const headers: Record<string, string> = {
    'X-DocuSign-Edit': JSON.stringify({
      LockToken: lockToken,
      LockDurationInSeconds: String(lockDurationInSeconds),
    }),
  };

  return await docuSignApiRequest.call(
    ctx,
    'PUT',
    `/envelopes/${envelopeId}/lock`,
    {
      lockDurationInSeconds: String(lockDurationInSeconds),
      lockType: 'edit',
    },
    {},
    undefined,
    headers,
  );
}

/**
 * Handles unlocking an envelope.
 */
async function handleEnvelopeLockDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const lockToken = ctx.getNodeParameter('lockToken', itemIndex) as string;

  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Lock Token', lockToken, 'required');

  const headers: Record<string, string> = {
    'X-DocuSign-Edit': JSON.stringify({
      LockToken: lockToken,
    }),
  };

  return await docuSignApiRequest.call(
    ctx,
    'DELETE',
    `/envelopes/${envelopeId}/lock`,
    undefined,
    {},
    undefined,
    headers,
  );
}

// ============================================================================
// Document Generation Handlers
// ============================================================================

/**
 * Handles getting document generation form fields from a draft envelope.
 */
async function handleDocGenGetFormFields(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;

  validateField('Envelope ID', envelopeId, 'uuid');

  return await docuSignApiRequest.call(
    ctx,
    'GET',
    `/envelopes/${envelopeId}/docGenFormFields`,
  );
}

/**
 * Handles updating document generation form fields with dynamic data.
 */
async function handleDocGenUpdateFormFields(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const documentId = ctx.getNodeParameter('documentId', itemIndex) as string;
  const formFieldsData = ctx.getNodeParameter('formFields', itemIndex, {}) as IDataObject;

  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Document ID', documentId, 'required');

  const docGenFormFieldList: IDataObject[] = [];
  if (formFieldsData.field) {
    const fields = formFieldsData.field as IDataObject[];
    for (const f of fields) {
      validateField('Field Name', f.name as string, 'required');
      docGenFormFieldList.push({
        name: f.name as string,
        value: (f.value as string) || '',
      });
    }
  }

  return await docuSignApiRequest.call(
    ctx,
    'PUT',
    `/envelopes/${envelopeId}/docGenFormFields`,
    {
      docGenFormFields: [
        {
          documentId,
          docGenFormFieldList,
        },
      ],
    },
  );
}

// ============================================================================
// Signing Group Handlers
// ============================================================================

/**
 * Handles creating a signing group.
 * DocuSign uses batch API — wraps single group in array.
 */
async function handleSigningGroupCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const groupName = ctx.getNodeParameter('groupName', itemIndex) as string;
  const membersData = ctx.getNodeParameter('members', itemIndex, {}) as IDataObject;

  validateField('Group Name', groupName, 'required');

  const users: IDataObject[] = [];
  if (membersData.member) {
    const members = membersData.member as IDataObject[];
    for (const m of members) {
      validateField('Member Email', m.email as string, 'email');
      validateField('Member Name', m.name as string, 'required');
      users.push({
        email: m.email as string,
        userName: m.name as string,
      });
    }
  }

  const response = await docuSignApiRequest.call(ctx, 'POST', '/signing_groups', {
    groups: [
      {
        groupName,
        groupType: 'sharedSigningGroup',
        users,
      },
    ],
  });

  const groups = (response.groups as IDataObject[]) || [];
  return groups[0] || response;
}

/**
 * Handles getting a signing group.
 */
async function handleSigningGroupGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const signingGroupId = ctx.getNodeParameter('signingGroupId', itemIndex) as string;

  validateField('Signing Group ID', signingGroupId, 'uuid');

  return await docuSignApiRequest.call(ctx, 'GET', `/signing_groups/${signingGroupId}`);
}

/**
 * Handles getting all signing groups.
 */
async function handleSigningGroupGetAll(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject[]> {
  const returnAll = ctx.getNodeParameter('returnAll', itemIndex) as boolean;

  if (returnAll) {
    return await docuSignApiRequestAllItems.call(ctx, 'GET', '/signing_groups', 'groups', {});
  }

  const limit = ctx.getNodeParameter('limit', itemIndex);
  const response = await docuSignApiRequest.call(ctx, 'GET', '/signing_groups', undefined, {
    count: limit,
  });
  return (response.groups as IDataObject[]) || [];
}

/**
 * Handles updating a signing group.
 * DocuSign uses batch API — wraps single group in array.
 */
async function handleSigningGroupUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const signingGroupId = ctx.getNodeParameter('signingGroupId', itemIndex) as string;
  const updateFields = ctx.getNodeParameter('updateFields', itemIndex, {});

  validateField('Signing Group ID', signingGroupId, 'uuid');

  const group: IDataObject = { signingGroupId };

  if (updateFields.groupName) {
    group.groupName = updateFields.groupName;
  }

  if (updateFields.members) {
    const membersData = updateFields.members as IDataObject;
    if (membersData.member) {
      const members = membersData.member as IDataObject[];
      const users: IDataObject[] = [];
      for (const m of members) {
        validateField('Member Email', m.email as string, 'email');
        validateField('Member Name', m.name as string, 'required');
        users.push({
          email: m.email as string,
          userName: m.name as string,
        });
      }
      group.users = users;
    }
  }

  if (!updateFields.groupName && !updateFields.members) {
    throw new Error('At least one update field (group name or members) is required');
  }

  const response = await docuSignApiRequest.call(ctx, 'PUT', '/signing_groups', {
    groups: [group],
  });

  const groups = (response.groups as IDataObject[]) || [];
  return groups[0] || response;
}

/**
 * Handles deleting a signing group.
 * DocuSign uses batch API — wraps single group in array.
 */
async function handleSigningGroupDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const signingGroupId = ctx.getNodeParameter('signingGroupId', itemIndex) as string;

  validateField('Signing Group ID', signingGroupId, 'uuid');

  return await docuSignApiRequest.call(ctx, 'DELETE', '/signing_groups', {
    groups: [{ signingGroupId }],
  });
}

// ============================================================================
// Brand Handlers
// ============================================================================

/**
 * Handles creating a brand.
 */
async function handleBrandCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const brandName = ctx.getNodeParameter('brandName', itemIndex) as string;
  const additionalOptions = ctx.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

  validateField('Brand Name', brandName, 'required');

  const brand: IDataObject = { brandName };

  if (additionalOptions.brandCompany) {
    brand.brandCompany = additionalOptions.brandCompany;
  }
  if (additionalOptions.defaultBrandLanguage) {
    brand.defaultBrandLanguage = additionalOptions.defaultBrandLanguage;
  }
  if (additionalOptions.isOverridingCompanyName !== undefined) {
    brand.isOverridingCompanyName = additionalOptions.isOverridingCompanyName ? 'true' : 'false';
  }

  const response = await docuSignApiRequest.call(ctx, 'POST', '/brands', {
    brands: [brand],
  });

  const brands = (response.brands as IDataObject[]) || [];
  return brands[0] || response;
}

/**
 * Handles getting a brand.
 */
async function handleBrandGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const brandId = ctx.getNodeParameter('brandId', itemIndex) as string;

  validateField('Brand ID', brandId, 'required');

  return await docuSignApiRequest.call(ctx, 'GET', `/brands/${brandId}`);
}

/**
 * Handles getting all brands.
 */
async function handleBrandGetAll(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject[]> {
  const returnAll = ctx.getNodeParameter('returnAll', itemIndex) as boolean;

  if (returnAll) {
    return await docuSignApiRequestAllItems.call(ctx, 'GET', '/brands', 'brands', {});
  }

  const limit = ctx.getNodeParameter('limit', itemIndex);
  const response = await docuSignApiRequest.call(ctx, 'GET', '/brands', undefined, {
    count: limit,
  });
  return (response.brands as IDataObject[]) || [];
}

/**
 * Handles updating a brand.
 */
async function handleBrandUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const brandId = ctx.getNodeParameter('brandId', itemIndex) as string;
  const updateFields = ctx.getNodeParameter('updateFields', itemIndex, {});

  validateField('Brand ID', brandId, 'required');

  if (!updateFields.brandName && !updateFields.brandCompany && updateFields.isOverridingCompanyName === undefined) {
    throw new Error('At least one update field is required');
  }

  const body: IDataObject = {};
  if (updateFields.brandName) {
    body.brandName = updateFields.brandName;
  }
  if (updateFields.brandCompany) {
    body.brandCompany = updateFields.brandCompany;
  }
  if (updateFields.isOverridingCompanyName !== undefined) {
    body.isOverridingCompanyName = updateFields.isOverridingCompanyName ? 'true' : 'false';
  }

  return await docuSignApiRequest.call(ctx, 'PUT', `/brands/${brandId}`, body);
}

/**
 * Handles deleting a brand.
 */
async function handleBrandDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const brandId = ctx.getNodeParameter('brandId', itemIndex) as string;

  validateField('Brand ID', brandId, 'required');

  return await docuSignApiRequest.call(ctx, 'DELETE', '/brands', {
    brands: [{ brandId }],
  });
}

// ============================================================================
// Recipient Tabs Handlers
// ============================================================================

/**
 * Handles getting tabs for a specific recipient in an envelope.
 */
async function handleRecipientTabsGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const recipientId = ctx.getNodeParameter('recipientId', itemIndex) as string;

  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Recipient ID', recipientId, 'required');

  return await docuSignApiRequest.call(
    ctx,
    'GET',
    `/envelopes/${envelopeId}/recipients/${recipientId}/tabs`,
  );
}

/**
 * Handles updating tabs for a specific recipient in an envelope.
 */
async function handleRecipientTabsUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const recipientId = ctx.getNodeParameter('recipientId', itemIndex) as string;
  const tabsData = ctx.getNodeParameter('tabs', itemIndex, {}) as IDataObject;

  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Recipient ID', recipientId, 'required');

  const body: IDataObject = {};

  if (tabsData.textTabs) {
    const textTabsData = tabsData.textTabs as IDataObject;
    if (textTabsData.tab) {
      body.textTabs = (textTabsData.tab as IDataObject[]).map((t) => ({
        tabLabel: t.tabLabel,
        value: t.value,
      }));
    }
  }

  if (tabsData.checkboxTabs) {
    const checkboxTabsData = tabsData.checkboxTabs as IDataObject;
    if (checkboxTabsData.tab) {
      body.checkboxTabs = (checkboxTabsData.tab as IDataObject[]).map((t) => ({
        tabLabel: t.tabLabel,
        selected: t.selected ? 'true' : 'false',
      }));
    }
  }

  return await docuSignApiRequest.call(
    ctx,
    'PUT',
    `/envelopes/${envelopeId}/recipients/${recipientId}/tabs`,
    body,
  );
}

// ============================================================================
// Comments Handlers
// ============================================================================

/**
 * Handles creating a comment on an envelope.
 */
async function handleCommentsCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const commentText = ctx.getNodeParameter('commentText', itemIndex) as string;
  const additionalOptions = ctx.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Comment Text', commentText, 'required');

  const comment: IDataObject = { text: commentText };

  if (additionalOptions.threadId) {
    comment.threadId = additionalOptions.threadId;
  }

  return await docuSignApiRequest.call(
    ctx,
    'POST',
    `/envelopes/${envelopeId}/comments`,
    { comments: [comment] },
  );
}

/**
 * Handles getting comments for an envelope.
 */
async function handleCommentsGetAll(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject[] | IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const returnAll = ctx.getNodeParameter('returnAll', itemIndex) as boolean;

  validateField('Envelope ID', envelopeId, 'uuid');

  if (returnAll) {
    return await docuSignApiRequestAllItems.call(
      ctx,
      'GET',
      `/envelopes/${envelopeId}/comments`,
      'comments',
      {},
    );
  }

  const limit = ctx.getNodeParameter('limit', itemIndex);
  const response = await docuSignApiRequest.call(
    ctx,
    'GET',
    `/envelopes/${envelopeId}/comments`,
    undefined,
    { count: limit },
  );
  return (response.comments as IDataObject[]) || [];
}

// ============================================================================
// Account User Handlers
// ============================================================================

/**
 * Handles creating a new account user.
 */
async function handleAccountUserCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const email = ctx.getNodeParameter('email', itemIndex) as string;
  const userName = ctx.getNodeParameter('userName', itemIndex) as string;
  const additionalOptions = ctx.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

  validateField('Email', email, 'email');
  validateField('User Name', userName, 'required');

  const user: IDataObject = { email, userName };

  if (additionalOptions.activationAccessCode) {
    user.activationAccessCode = additionalOptions.activationAccessCode;
  }
  if (additionalOptions.company) {
    user.company = additionalOptions.company;
  }
  if (additionalOptions.jobTitle) {
    user.jobTitle = additionalOptions.jobTitle;
  }

  const response = await docuSignApiRequest.call(ctx, 'POST', '/users', {
    newUsers: [user],
  });

  const newUsers = (response.newUsers as IDataObject[]) || [];
  return newUsers[0] || response;
}

/**
 * Handles getting a single account user.
 */
async function handleAccountUserGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const userId = ctx.getNodeParameter('userId', itemIndex) as string;

  validateField('User ID', userId, 'uuid');

  return await docuSignApiRequest.call(ctx, 'GET', `/users/${userId}`);
}

/**
 * Handles getting all account users.
 */
async function handleAccountUserGetAll(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject[]> {
  const returnAll = ctx.getNodeParameter('returnAll', itemIndex) as boolean;
  const filters = ctx.getNodeParameter('filters', itemIndex, {});
  const qs: Record<string, string | number> = {};

  if (filters.status) {
    qs.status = filters.status as string;
  }
  if (filters.email) {
    qs.email = filters.email as string;
  }

  if (returnAll) {
    return await docuSignApiRequestAllItems.call(ctx, 'GET', '/users', 'users', qs);
  }

  const limit = ctx.getNodeParameter('limit', itemIndex);
  qs.count = limit;
  const response = await docuSignApiRequest.call(ctx, 'GET', '/users', undefined, qs);
  return (response.users as IDataObject[]) || [];
}

/**
 * Handles updating an account user.
 */
async function handleAccountUserUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const userId = ctx.getNodeParameter('userId', itemIndex) as string;
  const updateFields = ctx.getNodeParameter('updateFields', itemIndex, {});

  validateField('User ID', userId, 'uuid');

  if (!updateFields.email && !updateFields.userName && !updateFields.company && !updateFields.jobTitle) {
    throw new Error('At least one update field is required');
  }

  if (updateFields.email) {
    validateField('Email', updateFields.email as string, 'email');
  }

  const body: IDataObject = {};
  if (updateFields.email) {
    body.email = updateFields.email;
  }
  if (updateFields.userName) {
    body.userName = updateFields.userName;
  }
  if (updateFields.company) {
    body.company = updateFields.company;
  }
  if (updateFields.jobTitle) {
    body.jobTitle = updateFields.jobTitle;
  }

  return await docuSignApiRequest.call(ctx, 'PUT', `/users/${userId}`, body);
}

/**
 * Handles deleting an account user.
 */
async function handleAccountUserDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const userId = ctx.getNodeParameter('userId', itemIndex) as string;

  validateField('User ID', userId, 'uuid');

  return await docuSignApiRequest.call(ctx, 'DELETE', '/users', {
    users: [{ userId }],
  });
}

// ============================================================================
// Account Group Handlers
// ============================================================================

/**
 * Handles creating a permission group.
 */
async function handleAccountGroupCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const groupName = ctx.getNodeParameter('groupName', itemIndex) as string;
  const additionalOptions = ctx.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

  validateField('Group Name', groupName, 'required');

  const group: IDataObject = { groupName };

  if (additionalOptions.permissionProfileId) {
    group.permissionProfileId = additionalOptions.permissionProfileId;
  }

  const response = await docuSignApiRequest.call(ctx, 'POST', '/groups', {
    groups: [group],
  });

  const groups = (response.groups as IDataObject[]) || [];
  return groups[0] || response;
}

/**
 * Handles getting all permission groups.
 */
async function handleAccountGroupGetAll(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject[]> {
  const returnAll = ctx.getNodeParameter('returnAll', itemIndex) as boolean;

  if (returnAll) {
    return await docuSignApiRequestAllItems.call(ctx, 'GET', '/groups', 'groups', {});
  }

  const limit = ctx.getNodeParameter('limit', itemIndex);
  const response = await docuSignApiRequest.call(ctx, 'GET', '/groups', undefined, {
    count: limit,
  });
  return (response.groups as IDataObject[]) || [];
}

/**
 * Handles updating a permission group.
 */
async function handleAccountGroupUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const groupId = ctx.getNodeParameter('groupId', itemIndex) as string;
  const updateFields = ctx.getNodeParameter('updateFields', itemIndex, {});

  validateField('Group ID', groupId, 'required');

  if (!updateFields.groupName && !updateFields.permissionProfileId) {
    throw new Error('At least one update field is required');
  }

  const group: IDataObject = { groupId };
  if (updateFields.groupName) {
    group.groupName = updateFields.groupName;
  }
  if (updateFields.permissionProfileId) {
    group.permissionProfileId = updateFields.permissionProfileId;
  }

  const response = await docuSignApiRequest.call(ctx, 'PUT', '/groups', {
    groups: [group],
  });
  const groups = (response.groups as IDataObject[]) || [];
  return groups[0] || response;
}

/**
 * Handles deleting a permission group.
 */
async function handleAccountGroupDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const groupId = ctx.getNodeParameter('groupId', itemIndex) as string;

  validateField('Group ID', groupId, 'required');

  return await docuSignApiRequest.call(ctx, 'DELETE', '/groups', {
    groups: [{ groupId }],
  });
}

// ============================================================================
// Connect Configuration Handlers
// ============================================================================

/**
 * Handles creating a Connect configuration.
 */
async function handleConnectConfigCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const name = ctx.getNodeParameter('name', itemIndex) as string;
  const urlToPublishTo = ctx.getNodeParameter('urlToPublishTo', itemIndex) as string;
  const events = ctx.getNodeParameter('events', itemIndex) as string[];
  const additionalOptions = ctx.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

  validateField('Configuration Name', name, 'required');
  validateField('URL to Publish', urlToPublishTo, 'url');

  const body: IDataObject = {
    name,
    urlToPublishTo,
    allUsers: 'true',
    allowEnvelopePublish: 'true',
    envelopeEvents: events
      .filter((e) => e.startsWith('envelope-'))
      .map((e) => ({ envelopeEventStatusCode: e })),
    recipientEvents: events
      .filter((e) => e.startsWith('recipient-'))
      .map((e) => ({ recipientEventStatusCode: e })),
  };

  if (additionalOptions.includeDocuments !== undefined) {
    body.includeDocumentFields = additionalOptions.includeDocuments ? 'true' : 'false';
  }
  if (additionalOptions.includeRecipients !== undefined) {
    body.includeRecipients = additionalOptions.includeRecipients ? 'true' : 'false';
  }
  if (additionalOptions.requiresAcknowledgement !== undefined) {
    body.requiresAcknowledgement = additionalOptions.requiresAcknowledgement ? 'true' : 'false';
  }

  return await docuSignApiRequest.call(ctx, 'POST', '/connect', body);
}

/**
 * Handles getting a single Connect configuration.
 */
async function handleConnectConfigGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const connectId = ctx.getNodeParameter('connectId', itemIndex) as string;

  validateField('Connect ID', connectId, 'required');

  return await docuSignApiRequest.call(ctx, 'GET', `/connect/${connectId}`);
}

/**
 * Handles getting all Connect configurations.
 */
async function handleConnectConfigGetAll(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject[]> {
  const returnAll = ctx.getNodeParameter('returnAll', itemIndex) as boolean;

  if (returnAll) {
    return await docuSignApiRequestAllItems.call(
      ctx,
      'GET',
      '/connect',
      'configurations',
      {},
    );
  }

  const limit = ctx.getNodeParameter('limit', itemIndex);
  const response = await docuSignApiRequest.call(ctx, 'GET', '/connect', undefined, {
    count: limit,
  });
  return (response.configurations as IDataObject[]) || [];
}

/**
 * Handles updating a Connect configuration.
 */
async function handleConnectConfigUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const connectId = ctx.getNodeParameter('connectId', itemIndex) as string;
  const updateFields = ctx.getNodeParameter('updateFields', itemIndex, {});

  validateField('Connect ID', connectId, 'required');

  if (!updateFields.name && !updateFields.urlToPublishTo && updateFields.allowEnvelopePublish === undefined) {
    throw new Error('At least one update field is required');
  }

  const body: IDataObject = { connectId };
  if (updateFields.name) {
    body.name = updateFields.name;
  }
  if (updateFields.urlToPublishTo) {
    validateField('URL to Publish', updateFields.urlToPublishTo as string, 'url');
    body.urlToPublishTo = updateFields.urlToPublishTo;
  }
  if (updateFields.allowEnvelopePublish !== undefined) {
    body.allowEnvelopePublish = updateFields.allowEnvelopePublish ? 'true' : 'false';
  }

  return await docuSignApiRequest.call(ctx, 'PUT', '/connect', body);
}

/**
 * Handles deleting a Connect configuration.
 */
async function handleConnectConfigDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const connectId = ctx.getNodeParameter('connectId', itemIndex) as string;

  validateField('Connect ID', connectId, 'required');

  return await docuSignApiRequest.call(ctx, 'DELETE', `/connect/${connectId}`);
}

// ============================================================================
// Composite Template Handlers
// ============================================================================

/**
 * Handles creating an envelope using composite templates.
 */
async function handleCompositeTemplateCreateEnvelope(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const emailSubject = ctx.getNodeParameter('emailSubject', itemIndex) as string;
  const serverTemplateIds = ctx.getNodeParameter('serverTemplateIds', itemIndex) as string;
  const signerEmail = ctx.getNodeParameter('signerEmail', itemIndex) as string;
  const signerName = ctx.getNodeParameter('signerName', itemIndex) as string;
  const roleName = ctx.getNodeParameter('roleName', itemIndex) as string;
  const additionalOptions = ctx.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

  validateField('Email Subject', emailSubject, 'required');
  validateField('Server Template IDs', serverTemplateIds, 'required');
  validateField('Signer Email', signerEmail, 'email');
  validateField('Signer Name', signerName, 'required');

  const templateIds = serverTemplateIds
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  for (const id of templateIds) {
    validateField('Template ID', id, 'uuid');
  }

  const compositeTemplates = templateIds.map((templateId, index) => ({
    compositeTemplateId: String(index + 1),
    serverTemplates: [{ sequence: '1', templateId }],
    inlineTemplates: [
      {
        sequence: '2',
        recipients: {
          signers: [
            {
              email: signerEmail,
              name: signerName,
              roleName,
              recipientId: '1',
            },
          ],
        },
      },
    ],
  }));

  const sendImmediately = additionalOptions.sendImmediately !== false;
  const envelope: IDataObject = {
    emailSubject,
    compositeTemplates,
    status: sendImmediately ? 'sent' : 'created',
  };

  if (additionalOptions.emailBlurb) {
    envelope.emailBlurb = additionalOptions.emailBlurb;
  }

  return await docuSignApiRequest.call(ctx, 'POST', '/envelopes', envelope);
}

// ============================================================================
// Payment Tab Handlers
// ============================================================================

/**
 * Handles creating an envelope with payment collection.
 */
async function handlePaymentTabCreateEnvelope(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const emailSubject = ctx.getNodeParameter('emailSubject', itemIndex) as string;
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  const signerEmail = ctx.getNodeParameter('signerEmail', itemIndex) as string;
  const signerName = ctx.getNodeParameter('signerName', itemIndex) as string;
  const paymentAmount = ctx.getNodeParameter('paymentAmount', itemIndex) as string;
  const currencyCode = ctx.getNodeParameter('currencyCode', itemIndex) as string;
  const gatewayAccountId = ctx.getNodeParameter('gatewayAccountId', itemIndex) as string;
  const itemName = ctx.getNodeParameter('itemName', itemIndex) as string;

  validateField('Email Subject', emailSubject, 'required');
  validateField('Template ID', templateId, 'uuid');
  validateField('Signer Email', signerEmail, 'email');
  validateField('Signer Name', signerName, 'required');
  validateField('Payment Amount', paymentAmount, 'required');
  validateField('Gateway Account ID', gatewayAccountId, 'required');
  validateField('Item Name', itemName, 'required');

  const amount = parseFloat(paymentAmount);
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Payment Amount must be a positive number');
  }

  const envelope: IDataObject = {
    templateId,
    emailSubject,
    templateRoles: [
      {
        email: signerEmail,
        name: signerName,
        roleName: 'Signer',
        tabs: {
          paymentTabs: [
            {
              paymentDetails: {
                currencyCode,
                gatewayAccountId,
                lineItems: [
                  {
                    name: itemName,
                    amount: paymentAmount,
                  },
                ],
              },
            },
          ],
        },
      },
    ],
    status: 'sent',
  };

  return await docuSignApiRequest.call(ctx, 'POST', '/envelopes', envelope);
}

// ============================================================================
// Supplemental Document Handlers
// ============================================================================

/**
 * Handles adding a supplemental document to an envelope.
 */
async function handleSupplementalDocAdd(
  ctx: IExecuteFunctions,
  items: INodeExecutionData[],
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const documentInput = ctx.getNodeParameter('document', itemIndex) as string;
  const documentName = ctx.getNodeParameter('documentName', itemIndex) as string;
  const display = ctx.getNodeParameter('display', itemIndex) as string;
  const additionalOptions = ctx.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Document Name', documentName, 'required');

  const documentBase64 = resolveDocumentBase64(items, itemIndex, documentInput);
  const fileExtension = getFileExtension(documentName);

  const document: IDataObject = {
    documentBase64,
    name: documentName,
    fileExtension,
    documentId: '999',
    display,
    includeInDownload: additionalOptions.includeInDownload !== false ? 'true' : 'false',
  };

  if (additionalOptions.signerMustAcknowledge) {
    document.signerMustAcknowledge = additionalOptions.signerMustAcknowledge;
  }

  return await docuSignApiRequest.call(
    ctx,
    'PUT',
    `/envelopes/${envelopeId}/documents/999`,
    document,
  );
}

// ============================================================================
// Envelope Transfer Handlers
// ============================================================================

/**
 * Handles getting all transfer rules.
 */
async function handleEnvelopeTransferGetRules(ctx: IExecuteFunctions): Promise<IDataObject> {
  return await docuSignApiRequest.call(ctx, 'GET', '/envelopes/transfer_rules');
}

/**
 * Handles creating a transfer rule.
 */
async function handleEnvelopeTransferCreateRule(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const fromUserEmail = ctx.getNodeParameter('fromUserEmail', itemIndex) as string;
  const toUserEmail = ctx.getNodeParameter('toUserEmail', itemIndex) as string;
  const additionalOptions = ctx.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

  validateField('From User Email', fromUserEmail, 'email');
  validateField('To User Email', toUserEmail, 'email');

  const rule: IDataObject = {
    fromUser: { email: fromUserEmail },
    toUser: { email: toUserEmail },
    carbonCopyOriginalOwner: additionalOptions.carbonCopyOriginalOwner ? 'true' : 'false',
  };

  return await docuSignApiRequest.call(ctx, 'POST', '/envelopes/transfer_rules', {
    envelopeTransferRules: [rule],
  });
}

/**
 * Handles updating a transfer rule.
 */
async function handleEnvelopeTransferUpdateRule(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const transferRuleId = ctx.getNodeParameter('transferRuleId', itemIndex) as string;
  const updateFields = ctx.getNodeParameter('updateFields', itemIndex, {});

  validateField('Transfer Rule ID', transferRuleId, 'required');

  if (!updateFields.toUserEmail && updateFields.enabled === undefined) {
    throw new Error('At least one update field is required');
  }

  const rule: IDataObject = { envelopeTransferRuleId: transferRuleId };

  if (updateFields.toUserEmail) {
    validateField('To User Email', updateFields.toUserEmail as string, 'email');
    rule.toUser = { email: updateFields.toUserEmail };
  }
  if (updateFields.enabled !== undefined) {
    rule.enabled = updateFields.enabled ? 'true' : 'false';
  }

  return await docuSignApiRequest.call(ctx, 'PUT', '/envelopes/transfer_rules', {
    envelopeTransferRules: [rule],
  });
}

/**
 * Handles deleting a transfer rule.
 */
async function handleEnvelopeTransferDeleteRule(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const transferRuleId = ctx.getNodeParameter('transferRuleId', itemIndex) as string;

  validateField('Transfer Rule ID', transferRuleId, 'required');

  return await docuSignApiRequest.call(ctx, 'DELETE', `/envelopes/transfer_rules/${transferRuleId}`);
}

// ============================================================================
// Template Recipients Handlers
// ============================================================================

/**
 * Handles adding a recipient to a template.
 */
async function handleTemplateRecipientsCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  const roleName = ctx.getNodeParameter('roleName', itemIndex) as string;
  const recipientType = ctx.getNodeParameter('recipientType', itemIndex) as string;
  const additionalOptions = ctx.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

  validateField('Template ID', templateId, 'uuid');
  validateField('Role Name', roleName, 'required');

  if (additionalOptions.email) {
    validateField('Email', additionalOptions.email as string, 'email');
  }

  const recipient: IDataObject = {
    roleName,
    recipientId: String(Date.now()),
    routingOrder: String(additionalOptions.routingOrder || 1),
  };

  if (additionalOptions.email) {
    recipient.email = additionalOptions.email;
  }
  if (additionalOptions.name) {
    recipient.name = additionalOptions.name;
  }

  const recipientKey = recipientType === 'cc' ? 'carbonCopies' : recipientType === 'certifiedDelivery' ? 'certifiedDeliveries' : 'signers';

  return await docuSignApiRequest.call(ctx, 'POST', `/templates/${templateId}/recipients`, {
    [recipientKey]: [recipient],
  });
}

/**
 * Handles getting all recipients for a template.
 */
async function handleTemplateRecipientsGetAll(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;

  validateField('Template ID', templateId, 'uuid');

  return await docuSignApiRequest.call(ctx, 'GET', `/templates/${templateId}/recipients`);
}

/**
 * Handles updating a template recipient.
 */
async function handleTemplateRecipientsUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  const recipientId = ctx.getNodeParameter('recipientId', itemIndex) as string;
  const updateFields = ctx.getNodeParameter('updateFields', itemIndex, {});

  validateField('Template ID', templateId, 'uuid');
  validateField('Recipient ID', recipientId, 'required');

  if (!updateFields.email && !updateFields.name && !updateFields.roleName) {
    throw new Error('At least one update field is required');
  }

  if (updateFields.email) {
    validateField('Email', updateFields.email as string, 'email');
  }

  const signer: IDataObject = { recipientId };
  if (updateFields.email) {
    signer.email = updateFields.email;
  }
  if (updateFields.name) {
    signer.name = updateFields.name;
  }
  if (updateFields.roleName) {
    signer.roleName = updateFields.roleName;
  }

  return await docuSignApiRequest.call(ctx, 'PUT', `/templates/${templateId}/recipients`, {
    signers: [signer],
  });
}

/**
 * Handles deleting a template recipient.
 */
async function handleTemplateRecipientsDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  const recipientId = ctx.getNodeParameter('recipientId', itemIndex) as string;

  validateField('Template ID', templateId, 'uuid');
  validateField('Recipient ID', recipientId, 'required');

  return await docuSignApiRequest.call(
    ctx,
    'DELETE',
    `/templates/${templateId}/recipients/${recipientId}`,
  );
}

// ============================================================================
// Scheduled Routing Handlers
// ============================================================================

/**
 * Handles getting the workflow for an envelope.
 */
async function handleScheduledRoutingGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;

  validateField('Envelope ID', envelopeId, 'uuid');

  return await docuSignApiRequest.call(ctx, 'GET', `/envelopes/${envelopeId}/workflow`);
}

/**
 * Handles updating scheduled routing for an envelope.
 */
async function handleScheduledRoutingUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const scheduledSendDate = ctx.getNodeParameter('scheduledSendDate', itemIndex) as string;
  const additionalOptions = ctx.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Scheduled Send Date', scheduledSendDate, 'date');

  const workflow: IDataObject = {
    scheduledSending: {
      rules: [
        {
          resumeDate: scheduledSendDate,
        },
      ],
    },
  };

  if (additionalOptions.resumeDate) {
    validateField('Resume Date', additionalOptions.resumeDate as string, 'date');
    ((workflow.scheduledSending as IDataObject).rules as IDataObject[])[0].resumeDate =
      additionalOptions.resumeDate;
  }

  return await docuSignApiRequest.call(ctx, 'PUT', `/envelopes/${envelopeId}/workflow`, workflow);
}

/**
 * Handles deleting scheduled routing for an envelope.
 */
async function handleScheduledRoutingDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;

  validateField('Envelope ID', envelopeId, 'uuid');

  return await docuSignApiRequest.call(ctx, 'DELETE', `/envelopes/${envelopeId}/workflow`);
}

// ============================================================================
// Chunked Upload Handlers
// ============================================================================

/**
 * Handles initiating a chunked upload session.
 */
async function handleChunkedUploadInitiate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const contentType = ctx.getNodeParameter('contentType', itemIndex) as string;
  const totalSize = ctx.getNodeParameter('totalSize', itemIndex) as number;

  validateField('Content Type', contentType, 'required');

  if (totalSize <= 0) {
    throw new Error('Total Size must be a positive number');
  }

  return await docuSignApiRequest.call(ctx, 'POST', '/chunked_uploads', {
    contentType,
    totalSize: String(totalSize),
  });
}

/**
 * Handles uploading a chunk to an active session.
 */
async function handleChunkedUploadChunk(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const chunkedUploadId = ctx.getNodeParameter('chunkedUploadId', itemIndex) as string;
  const chunkPart = ctx.getNodeParameter('chunkPart', itemIndex) as number;
  const chunkData = ctx.getNodeParameter('chunkData', itemIndex) as string;

  validateField('Chunked Upload ID', chunkedUploadId, 'required');
  validateField('Chunk Data', chunkData, 'base64');

  return await docuSignApiRequest.call(
    ctx,
    'PUT',
    `/chunked_uploads/${chunkedUploadId}/${chunkPart}`,
    { data: chunkData },
  );
}

/**
 * Handles committing (finalizing) a chunked upload.
 */
async function handleChunkedUploadCommit(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const chunkedUploadId = ctx.getNodeParameter('chunkedUploadId', itemIndex) as string;

  validateField('Chunked Upload ID', chunkedUploadId, 'required');

  return await docuSignApiRequest.call(ctx, 'PUT', `/chunked_uploads/${chunkedUploadId}`, {
    action: 'commit',
  });
}

// ============================================================================
// ID Verification Handlers
// ============================================================================

/**
 * Handles getting available IDV workflows.
 */
async function handleIdVerificationGetWorkflows(ctx: IExecuteFunctions): Promise<IDataObject> {
  return await docuSignApiRequest.call(ctx, 'GET', '/identity_verification');
}

// ============================================================================
// Envelope Form Data / Views Handlers
// ============================================================================

/**
 * Get all form field data entered by recipients on an envelope
 */
async function handleEnvelopeGetFormData(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  validateField('Envelope ID', envelopeId, 'uuid');
  return await docuSignApiRequest.call(ctx, 'GET', `/envelopes/${envelopeId}/form_data`);
}

/**
 * Generate a sender view URL for reviewing/sending an envelope
 */
async function handleEnvelopeCreateSenderView(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const returnUrl = ctx.getNodeParameter('returnUrl', itemIndex) as string;
  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Return URL', returnUrl, 'url');
  return await docuSignApiRequest.call(ctx, 'POST', `/envelopes/${envelopeId}/views/sender`, {
    returnUrl,
  });
}

/**
 * Generate an edit view URL for modifying an envelope
 */
async function handleEnvelopeCreateEditView(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const returnUrl = ctx.getNodeParameter('returnUrl', itemIndex) as string;
  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Return URL', returnUrl, 'url');
  return await docuSignApiRequest.call(ctx, 'POST', `/envelopes/${envelopeId}/views/edit`, {
    returnUrl,
  });
}

// ============================================================================
// PowerForm Data Handler
// ============================================================================

/**
 * Retrieve form data from PowerForm submissions
 */
async function handlePowerFormGetFormData(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const powerFormId = ctx.getNodeParameter('powerFormId', itemIndex) as string;
  validateField('PowerForm ID', powerFormId, 'uuid');
  return await docuSignApiRequest.call(ctx, 'GET', `/powerforms/${powerFormId}/form_data`);
}

// ============================================================================
// Envelope Custom Field Handlers
// ============================================================================

async function handleEnvelopeCustomFieldCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const fieldName = ctx.getNodeParameter('fieldName', itemIndex) as string;
  const fieldValue = ctx.getNodeParameter('fieldValue', itemIndex) as string;
  const show = ctx.getNodeParameter('show', itemIndex, true) as boolean;
  const required = ctx.getNodeParameter('required', itemIndex, false) as boolean;

  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Field Name', fieldName, 'required');

  const body: IDataObject = {
    textCustomFields: [
      {
        name: fieldName,
        value: fieldValue,
        show: show ? 'true' : 'false',
        required: required ? 'true' : 'false',
      },
    ],
  };

  return await docuSignApiRequest.call(
    ctx,
    'POST',
    `/envelopes/${envelopeId}/custom_fields`,
    body,
  );
}

async function handleEnvelopeCustomFieldGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  validateField('Envelope ID', envelopeId, 'uuid');
  return await docuSignApiRequest.call(ctx, 'GET', `/envelopes/${envelopeId}/custom_fields`);
}

async function handleEnvelopeCustomFieldUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const fieldId = ctx.getNodeParameter('fieldId', itemIndex) as string;
  const updateFields = ctx.getNodeParameter('updateFields', itemIndex, {});

  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Field ID', fieldId, 'required');

  const field: IDataObject = { fieldId };
  if (updateFields.name) {field.name = updateFields.name;}
  if (updateFields.value !== undefined) {field.value = updateFields.value;}
  if (updateFields.show !== undefined) {field.show = updateFields.show ? 'true' : 'false';}

  return await docuSignApiRequest.call(
    ctx,
    'PUT',
    `/envelopes/${envelopeId}/custom_fields`,
    { textCustomFields: [field] },
  );
}

async function handleEnvelopeCustomFieldDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const fieldId = ctx.getNodeParameter('fieldId', itemIndex) as string;

  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Field ID', fieldId, 'required');

  return await docuSignApiRequest.call(
    ctx,
    'DELETE',
    `/envelopes/${envelopeId}/custom_fields`,
    { textCustomFields: [{ fieldId }] },
  );
}

// ============================================================================
// Envelope Attachment Handlers
// ============================================================================

async function handleEnvelopeAttachmentGetAll(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  validateField('Envelope ID', envelopeId, 'uuid');
  return await docuSignApiRequest.call(ctx, 'GET', `/envelopes/${envelopeId}/attachments`);
}

async function handleEnvelopeAttachmentCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const name = ctx.getNodeParameter('name', itemIndex) as string;
  const data = ctx.getNodeParameter('data', itemIndex) as string;
  const accessControl = ctx.getNodeParameter('accessControl', itemIndex, 'sender') as string;

  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Attachment Name', name, 'required');
  validateField('Attachment Data', data, 'base64');

  return await docuSignApiRequest.call(ctx, 'PUT', `/envelopes/${envelopeId}/attachments`, {
    attachments: [{ name, data, accessControl }],
  });
}

async function handleEnvelopeAttachmentDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const attachmentId = ctx.getNodeParameter('attachmentId', itemIndex) as string;

  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Attachment ID', attachmentId, 'required');

  return await docuSignApiRequest.call(
    ctx,
    'DELETE',
    `/envelopes/${envelopeId}/attachments/${attachmentId}`,
  );
}

// ============================================================================
// Envelope Document Field Handlers
// ============================================================================

async function handleEnvelopeDocumentFieldGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const documentId = ctx.getNodeParameter('documentId', itemIndex) as string;

  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Document ID', documentId, 'required');

  return await docuSignApiRequest.call(
    ctx,
    'GET',
    `/envelopes/${envelopeId}/documents/${documentId}/fields`,
  );
}

async function handleEnvelopeDocumentFieldCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const documentId = ctx.getNodeParameter('documentId', itemIndex) as string;
  const documentFields = ctx.getNodeParameter('documentFields', itemIndex, {}) as IDataObject;

  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Document ID', documentId, 'required');

  const fields = ((documentFields.field as IDataObject[]) || []).map((f) => ({
    name: f.name,
    value: f.value,
  }));

  return await docuSignApiRequest.call(
    ctx,
    'POST',
    `/envelopes/${envelopeId}/documents/${documentId}/fields`,
    { documentFields: fields },
  );
}

async function handleEnvelopeDocumentFieldUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const documentId = ctx.getNodeParameter('documentId', itemIndex) as string;
  const documentFields = ctx.getNodeParameter('documentFields', itemIndex, {}) as IDataObject;

  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Document ID', documentId, 'required');

  const fields = ((documentFields.field as IDataObject[]) || []).map((f) => ({
    name: f.name,
    value: f.value,
  }));

  return await docuSignApiRequest.call(
    ctx,
    'PUT',
    `/envelopes/${envelopeId}/documents/${documentId}/fields`,
    { documentFields: fields },
  );
}

async function handleEnvelopeDocumentFieldDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const documentId = ctx.getNodeParameter('documentId', itemIndex) as string;

  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Document ID', documentId, 'required');

  return await docuSignApiRequest.call(
    ctx,
    'DELETE',
    `/envelopes/${envelopeId}/documents/${documentId}/fields`,
  );
}

// ============================================================================
// Envelope Email Setting Handlers
// ============================================================================

async function handleEnvelopeEmailSettingGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  validateField('Envelope ID', envelopeId, 'uuid');
  return await docuSignApiRequest.call(ctx, 'GET', `/envelopes/${envelopeId}/email_settings`);
}

async function handleEnvelopeEmailSettingCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const replyEmailAddressOverride = ctx.getNodeParameter(
    'replyEmailAddressOverride',
    itemIndex,
    '',
  ) as string;
  const replyEmailNameOverride = ctx.getNodeParameter(
    'replyEmailNameOverride',
    itemIndex,
    '',
  ) as string;
  const bccEmailAddresses = ctx.getNodeParameter('bccEmailAddresses', itemIndex, '') as string;

  validateField('Envelope ID', envelopeId, 'uuid');

  const body: IDataObject = {};
  if (replyEmailAddressOverride) {
    validateField('Reply Email', replyEmailAddressOverride, 'email');
    body.replyEmailAddressOverride = replyEmailAddressOverride;
  }
  if (replyEmailNameOverride) {
    body.replyEmailNameOverride = replyEmailNameOverride;
  }
  if (bccEmailAddresses) {
    const emails = bccEmailAddresses.split(',').map((e) => e.trim());
    for (const email of emails) {
      validateField('BCC Email', email, 'email');
    }
    body.bccEmailAddresses = emails.map((email) => ({ bccEmailAddressId: '', email }));
  }

  return await docuSignApiRequest.call(
    ctx,
    'POST',
    `/envelopes/${envelopeId}/email_settings`,
    body,
  );
}

async function handleEnvelopeEmailSettingUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const replyEmailAddressOverride = ctx.getNodeParameter(
    'replyEmailAddressOverride',
    itemIndex,
    '',
  ) as string;
  const replyEmailNameOverride = ctx.getNodeParameter(
    'replyEmailNameOverride',
    itemIndex,
    '',
  ) as string;
  const bccEmailAddresses = ctx.getNodeParameter('bccEmailAddresses', itemIndex, '') as string;

  validateField('Envelope ID', envelopeId, 'uuid');

  const body: IDataObject = {};
  if (replyEmailAddressOverride) {
    validateField('Reply Email', replyEmailAddressOverride, 'email');
    body.replyEmailAddressOverride = replyEmailAddressOverride;
  }
  if (replyEmailNameOverride) {
    body.replyEmailNameOverride = replyEmailNameOverride;
  }
  if (bccEmailAddresses) {
    const emails = bccEmailAddresses.split(',').map((e) => e.trim());
    for (const email of emails) {
      validateField('BCC Email', email, 'email');
    }
    body.bccEmailAddresses = emails.map((email) => ({ bccEmailAddressId: '', email }));
  }

  return await docuSignApiRequest.call(
    ctx,
    'PUT',
    `/envelopes/${envelopeId}/email_settings`,
    body,
  );
}

async function handleEnvelopeEmailSettingDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  validateField('Envelope ID', envelopeId, 'uuid');
  return await docuSignApiRequest.call(ctx, 'DELETE', `/envelopes/${envelopeId}/email_settings`);
}

// ============================================================================
// Custom Tab Handlers
// ============================================================================

async function handleCustomTabCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const tabLabel = ctx.getNodeParameter('tabLabel', itemIndex) as string;
  const type = ctx.getNodeParameter('type', itemIndex) as string;
  const additionalOptions = ctx.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

  validateField('Tab Label', tabLabel, 'required');

  const body: IDataObject = { tabLabel, type };
  if (additionalOptions.anchor) {body.anchor = additionalOptions.anchor;}
  if (additionalOptions.font) {body.font = additionalOptions.font;}
  if (additionalOptions.bold !== undefined) {body.bold = additionalOptions.bold ? 'true' : 'false';}
  if (additionalOptions.width) {body.width = additionalOptions.width;}
  if (additionalOptions.height) {body.height = additionalOptions.height;}
  if (additionalOptions.required !== undefined) {
    body.required = additionalOptions.required ? 'true' : 'false';
  }
  if (additionalOptions.locked !== undefined) {
    body.locked = additionalOptions.locked ? 'true' : 'false';
  }

  return await docuSignApiRequest.call(ctx, 'POST', '/tab_definitions', body);
}

async function handleCustomTabGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const customTabId = ctx.getNodeParameter('customTabId', itemIndex) as string;
  validateField('Custom Tab ID', customTabId, 'required');
  return await docuSignApiRequest.call(ctx, 'GET', `/tab_definitions/${customTabId}`);
}

async function handleCustomTabGetAll(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
  const returnAll = ctx.getNodeParameter('returnAll', itemIndex) as boolean;

  if (returnAll) {
    return await docuSignApiRequestAllItems.call(
      ctx,
      'GET',
      '/tab_definitions',
      'tabs',
      {},
    );
  }

  const limit = ctx.getNodeParameter('limit', itemIndex);
  const response = await docuSignApiRequest.call(ctx, 'GET', '/tab_definitions');
  const tabs = (response.tabs as IDataObject[]) || [];
  return tabs.slice(0, limit);
}

async function handleCustomTabUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const customTabId = ctx.getNodeParameter('customTabId', itemIndex) as string;
  const updateFields = ctx.getNodeParameter('updateFields', itemIndex, {});

  validateField('Custom Tab ID', customTabId, 'required');

  const body: IDataObject = {};
  if (updateFields.tabLabel) {body.tabLabel = updateFields.tabLabel;}
  if (updateFields.font) {body.font = updateFields.font;}
  if (updateFields.bold !== undefined) {body.bold = updateFields.bold ? 'true' : 'false';}
  if (updateFields.required !== undefined) {
    body.required = updateFields.required ? 'true' : 'false';
  }
  if (updateFields.locked !== undefined) {body.locked = updateFields.locked ? 'true' : 'false';}

  return await docuSignApiRequest.call(ctx, 'PUT', `/tab_definitions/${customTabId}`, body);
}

async function handleCustomTabDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const customTabId = ctx.getNodeParameter('customTabId', itemIndex) as string;
  validateField('Custom Tab ID', customTabId, 'required');
  return await docuSignApiRequest.call(ctx, 'DELETE', `/tab_definitions/${customTabId}`);
}

// ============================================================================
// Contact Handlers
// ============================================================================

async function handleContactCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const email = ctx.getNodeParameter('email', itemIndex) as string;
  const name = ctx.getNodeParameter('name', itemIndex) as string;
  const additionalOptions = ctx.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

  validateField('Email', email, 'email');
  validateField('Name', name, 'required');

  const contact: IDataObject = {
    name,
    emails: [email],
  };
  if (additionalOptions.organization) {contact.organization = additionalOptions.organization;}
  if (additionalOptions.shared !== undefined) {
    contact.shared = additionalOptions.shared ? 'true' : 'false';
  }

  return await docuSignApiRequest.call(ctx, 'POST', '/contacts', {
    contacts: [contact],
  });
}

async function handleContactGetAll(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
  const returnAll = ctx.getNodeParameter('returnAll', itemIndex) as boolean;

  if (returnAll) {
    return await docuSignApiRequestAllItems.call(
      ctx,
      'GET',
      '/contacts',
      'contacts',
      {},
    );
  }

  const limit = ctx.getNodeParameter('limit', itemIndex);
  const response = await docuSignApiRequest.call(ctx, 'GET', '/contacts', undefined, {
    count: limit,
  });
  return (response.contacts as IDataObject[]) || [];
}

async function handleContactUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const contactId = ctx.getNodeParameter('contactId', itemIndex) as string;
  const updateFields = ctx.getNodeParameter('updateFields', itemIndex, {});

  validateField('Contact ID', contactId, 'required');

  const contact: IDataObject = { contactId };
  if (updateFields.email) {
    validateField('Email', updateFields.email as string, 'email');
    contact.emails = [updateFields.email];
  }
  if (updateFields.name) {contact.name = updateFields.name;}
  if (updateFields.organization) {contact.organization = updateFields.organization;}
  if (updateFields.shared !== undefined) {
    contact.shared = updateFields.shared ? 'true' : 'false';
  }

  return await docuSignApiRequest.call(ctx, 'PUT', '/contacts', {
    contacts: [contact],
  });
}

async function handleContactDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const contactId = ctx.getNodeParameter('contactId', itemIndex) as string;
  validateField('Contact ID', contactId, 'required');
  return await docuSignApiRequest.call(ctx, 'DELETE', `/contacts/${contactId}`);
}

// ============================================================================
// Permission Profile Handlers
// ============================================================================

async function handlePermissionProfileCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const permissionProfileName = ctx.getNodeParameter(
    'permissionProfileName',
    itemIndex,
  ) as string;
  const settings = ctx.getNodeParameter('settings', itemIndex, {}) as IDataObject;

  validateField('Profile Name', permissionProfileName, 'required');

  const body: IDataObject = { permissionProfileName, settings };

  return await docuSignApiRequest.call(ctx, 'POST', '/permission_profiles', body);
}

async function handlePermissionProfileGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const permissionProfileId = ctx.getNodeParameter('permissionProfileId', itemIndex) as string;
  validateField('Permission Profile ID', permissionProfileId, 'required');
  return await docuSignApiRequest.call(
    ctx,
    'GET',
    `/permission_profiles/${permissionProfileId}`,
  );
}

async function handlePermissionProfileGetAll(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
  const returnAll = ctx.getNodeParameter('returnAll', itemIndex) as boolean;

  if (returnAll) {
    return await docuSignApiRequestAllItems.call(
      ctx,
      'GET',
      '/permission_profiles',
      'permissionProfiles',
      {},
    );
  }

  const limit = ctx.getNodeParameter('limit', itemIndex);
  const response = await docuSignApiRequest.call(ctx, 'GET', '/permission_profiles');
  const profiles = (response.permissionProfiles as IDataObject[]) || [];
  return profiles.slice(0, limit);
}

async function handlePermissionProfileUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const permissionProfileId = ctx.getNodeParameter('permissionProfileId', itemIndex) as string;
  const updateFields = ctx.getNodeParameter('updateFields', itemIndex, {});

  validateField('Permission Profile ID', permissionProfileId, 'required');

  const body: IDataObject = {};
  if (updateFields.permissionProfileName) {
    body.permissionProfileName = updateFields.permissionProfileName;
  }

  const settings: IDataObject = {};
  if (updateFields.canSendEnvelope !== undefined) {
    settings.canSendEnvelope = updateFields.canSendEnvelope ? 'true' : 'false';
  }
  if (updateFields.canManageTemplates !== undefined) {
    settings.canManageTemplates = updateFields.canManageTemplates ? 'true' : 'false';
  }
  if (updateFields.canManageAccount !== undefined) {
    settings.canManageAccount = updateFields.canManageAccount ? 'true' : 'false';
  }
  if (updateFields.canManageUsers !== undefined) {
    settings.canManageUsers = updateFields.canManageUsers ? 'true' : 'false';
  }
  if (Object.keys(settings).length > 0) {
    body.settings = settings;
  }

  return await docuSignApiRequest.call(
    ctx,
    'PUT',
    `/permission_profiles/${permissionProfileId}`,
    body,
  );
}

async function handlePermissionProfileDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const permissionProfileId = ctx.getNodeParameter('permissionProfileId', itemIndex) as string;
  validateField('Permission Profile ID', permissionProfileId, 'required');
  return await docuSignApiRequest.call(
    ctx,
    'DELETE',
    `/permission_profiles/${permissionProfileId}`,
  );
}

// ============================================================================
// Account Custom Field Handlers
// ============================================================================

async function handleAccountCustomFieldCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const fieldName = ctx.getNodeParameter('fieldName', itemIndex) as string;
  const fieldType = ctx.getNodeParameter('fieldType', itemIndex) as string;
  const additionalOptions = ctx.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

  validateField('Field Name', fieldName, 'required');

  const field: IDataObject = { name: fieldName };

  if (fieldType === 'list') {
    const listItems = (additionalOptions.listItems as string) || '';
    field.listItems = listItems.split(',').map((item: string) => item.trim());
  }
  if (additionalOptions.required !== undefined) {
    field.required = additionalOptions.required ? 'true' : 'false';
  }
  if (additionalOptions.show !== undefined) {
    field.show = additionalOptions.show ? 'true' : 'false';
  }

  const key = fieldType === 'list' ? 'listCustomFields' : 'textCustomFields';
  return await docuSignApiRequest.call(ctx, 'POST', '/custom_fields', { [key]: [field] });
}

async function handleAccountCustomFieldGetAll(
  ctx: IExecuteFunctions,
): Promise<IDataObject> {
  return await docuSignApiRequest.call(ctx, 'GET', '/custom_fields');
}

async function handleAccountCustomFieldUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const fieldId = ctx.getNodeParameter('fieldId', itemIndex) as string;
  const updateFields = ctx.getNodeParameter('updateFields', itemIndex, {});

  validateField('Field ID', fieldId, 'required');

  const field: IDataObject = { fieldId };
  if (updateFields.name) {field.name = updateFields.name;}
  if (updateFields.required !== undefined) {
    field.required = updateFields.required ? 'true' : 'false';
  }
  if (updateFields.show !== undefined) {
    field.show = updateFields.show ? 'true' : 'false';
  }
  if (updateFields.listItems) {
    field.listItems = (updateFields.listItems as string).split(',').map((item: string) => item.trim());
  }

  return await docuSignApiRequest.call(ctx, 'PUT', '/custom_fields', {
    textCustomFields: [field],
  });
}

async function handleAccountCustomFieldDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const fieldId = ctx.getNodeParameter('fieldId', itemIndex) as string;
  validateField('Field ID', fieldId, 'required');
  return await docuSignApiRequest.call(ctx, 'DELETE', `/custom_fields/${fieldId}`);
}

// ============================================================================
// Connect Event Handlers
// ============================================================================

async function handleConnectEventGetFailures(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
  const returnAll = ctx.getNodeParameter('returnAll', itemIndex) as boolean;

  if (returnAll) {
    return await docuSignApiRequestAllItems.call(
      ctx,
      'GET',
      '/connect/failures',
      'failures',
      {},
    );
  }

  const limit = ctx.getNodeParameter('limit', itemIndex);
  const response = await docuSignApiRequest.call(ctx, 'GET', '/connect/failures', undefined, {
    count: limit,
  });
  return (response.failures as IDataObject[]) || [];
}

async function handleConnectEventGetLogs(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
  const returnAll = ctx.getNodeParameter('returnAll', itemIndex) as boolean;
  const filters = ctx.getNodeParameter('filters', itemIndex, {});

  const qs: Record<string, string | number> = {};
  if (filters.fromDate) {qs.from_date = filters.fromDate as string;}
  if (filters.toDate) {qs.to_date = filters.toDate as string;}

  if (returnAll) {
    return await docuSignApiRequestAllItems.call(
      ctx,
      'GET',
      '/connect/logs',
      'logs',
      qs,
    );
  }

  const limit = ctx.getNodeParameter('limit', itemIndex);
  qs.count = limit;
  const response = await docuSignApiRequest.call(ctx, 'GET', '/connect/logs', undefined, qs);
  return (response.logs as IDataObject[]) || [];
}

async function handleConnectEventRetry(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const failureId = ctx.getNodeParameter('failureId', itemIndex) as string;
  validateField('Failure ID', failureId, 'required');
  return await docuSignApiRequest.call(ctx, 'PUT', `/connect/failures/${failureId}`);
}

// ============================================================================

// ============================================================================
// Envelope Notification Handlers
// ============================================================================

async function handleEnvelopeNotificationGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  validateField('Envelope ID', envelopeId, 'uuid');
  return await docuSignApiRequest.call(ctx, 'GET', `/envelopes/${envelopeId}/notification`);
}

async function handleEnvelopeNotificationUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const useAccountDefaults = ctx.getNodeParameter('useAccountDefaults', itemIndex, false) as boolean;
  const reminderSettings = ctx.getNodeParameter('reminderSettings', itemIndex, {}) as IDataObject;
  const expirationSettings = ctx.getNodeParameter('expirationSettings', itemIndex, {}) as IDataObject;

  validateField('Envelope ID', envelopeId, 'uuid');

  const body: IDataObject = {
    useAccountDefaults: useAccountDefaults ? 'true' : 'false',
  };

  if (!useAccountDefaults && reminderSettings.reminderEnabled) {
    body.reminders = {
      reminderEnabled: 'true',
      reminderDelay: String(reminderSettings.reminderDelay ?? 2),
      reminderFrequency: String(reminderSettings.reminderFrequency ?? 1),
    };
  }

  if (!useAccountDefaults && expirationSettings.expireEnabled) {
    body.expirations = {
      expireEnabled: 'true',
      expireAfter: String(expirationSettings.expireAfter ?? 120),
      expireWarn: String(expirationSettings.expireWarn ?? 3),
    };
  }

  return await docuSignApiRequest.call(ctx, 'PUT', `/envelopes/${envelopeId}/notification`, body);
}

// ============================================================================
// Template Document Handlers
// ============================================================================

async function handleTemplateDocumentGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  const documentId = ctx.getNodeParameter('documentId', itemIndex) as string;
  validateField('Template ID', templateId, 'uuid');
  validateField('Document ID', documentId, 'required');

  const authType = ctx.getNodeParameter('authentication', 0, 'jwt') as string;
  const credentialName = authType === 'oauth2' ? 'docuSignOAuth2Api' : 'docuSignApi';
  const credentials = await ctx.getCredentials(credentialName);
  const environment = credentials.environment as string;
  const region = (credentials.region as string) || 'na';
  const accountId = credentials.accountId as string;
  const baseUrl = getBaseUrl(environment, region);

  const response = (await ctx.helpers.httpRequestWithAuthentication.call(ctx, credentialName, {
    method: 'GET',
    url: `${baseUrl}/accounts/${accountId}/templates/${templateId}/documents/${documentId}`,
    encoding: 'arraybuffer',
    returnFullResponse: true,
  })) as { body: Buffer };

  const binaryData: IBinaryData = await ctx.helpers.prepareBinaryData(
    Buffer.from(response.body),
    `template_${templateId}_doc_${documentId}.pdf`,
    'application/pdf',
  );

  return { binary: binaryData, templateId, documentId } as unknown as IDataObject;
}

async function handleTemplateDocumentGetAll(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  validateField('Template ID', templateId, 'uuid');
  return await docuSignApiRequest.call(ctx, 'GET', `/templates/${templateId}/documents`);
}

async function handleTemplateDocumentAdd(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  const documentName = ctx.getNodeParameter('documentName', itemIndex) as string;
  const documentBase64 = ctx.getNodeParameter('documentBase64', itemIndex) as string;
  const fileExtension = ctx.getNodeParameter('fileExtension', itemIndex, 'pdf') as string;
  const documentOrder = ctx.getNodeParameter('documentOrder', itemIndex, 1) as number;

  validateField('Template ID', templateId, 'uuid');
  validateField('Document Name', documentName, 'required');
  validateField('Document Content', documentBase64, 'required');
  validateField('Document Content', documentBase64, 'base64');

  const body: IDataObject = {
    documents: [
      {
        documentBase64,
        name: documentName,
        fileExtension,
        documentId: String(documentOrder),
      },
    ],
  };

  return await docuSignApiRequest.call(ctx, 'PUT', `/templates/${templateId}/documents`, body);
}

async function handleTemplateDocumentRemove(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  const documentId = ctx.getNodeParameter('documentId', itemIndex) as string;
  validateField('Template ID', templateId, 'uuid');
  validateField('Document ID', documentId, 'required');
  return await docuSignApiRequest.call(ctx, 'DELETE', `/templates/${templateId}/documents/${documentId}`);
}

// ============================================================================
// Template Custom Field Handlers
// ============================================================================

async function handleTemplateCustomFieldCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  const fieldName = ctx.getNodeParameter('fieldName', itemIndex) as string;
  const fieldValue = ctx.getNodeParameter('fieldValue', itemIndex) as string;
  const show = ctx.getNodeParameter('show', itemIndex, true) as boolean;
  const required = ctx.getNodeParameter('required', itemIndex, false) as boolean;

  validateField('Template ID', templateId, 'uuid');
  validateField('Field Name', fieldName, 'required');

  const body: IDataObject = {
    textCustomFields: [
      {
        name: fieldName,
        value: fieldValue,
        show: show ? 'true' : 'false',
        required: required ? 'true' : 'false',
      },
    ],
  };

  return await docuSignApiRequest.call(ctx, 'POST', `/templates/${templateId}/custom_fields`, body);
}

async function handleTemplateCustomFieldGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  validateField('Template ID', templateId, 'uuid');
  return await docuSignApiRequest.call(ctx, 'GET', `/templates/${templateId}/custom_fields`);
}

async function handleTemplateCustomFieldUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  const fieldId = ctx.getNodeParameter('fieldId', itemIndex) as string;
  const updateFields = ctx.getNodeParameter('updateFields', itemIndex, {});

  validateField('Template ID', templateId, 'uuid');
  validateField('Field ID', fieldId, 'required');

  if (!updateFields || Object.keys(updateFields).length === 0) {
    throw new Error('At least one update field is required');
  }

  const field: IDataObject = { fieldId };
  if (updateFields.name) { field.name = updateFields.name; }
  if (updateFields.value !== undefined) { field.value = updateFields.value; }
  if (updateFields.show !== undefined) { field.show = updateFields.show ? 'true' : 'false'; }
  if (updateFields.required !== undefined) { field.required = updateFields.required ? 'true' : 'false'; }

  const body: IDataObject = {
    textCustomFields: [field],
  };

  return await docuSignApiRequest.call(ctx, 'PUT', `/templates/${templateId}/custom_fields`, body);
}

async function handleTemplateCustomFieldDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  const fieldId = ctx.getNodeParameter('fieldId', itemIndex) as string;
  validateField('Template ID', templateId, 'uuid');
  validateField('Field ID', fieldId, 'required');
  return await docuSignApiRequest.call(ctx, 'DELETE', `/templates/${templateId}/custom_fields`, { textCustomFields: [{ fieldId }] });
}

// ============================================================================
// Template Lock Handlers
// ============================================================================

async function handleTemplateLockCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  const lockDurationInSeconds = ctx.getNodeParameter('lockDurationInSeconds', itemIndex) as number;
  const lockedByApp = ctx.getNodeParameter('lockedByApp', itemIndex, 'n8n') as string;

  validateField('Template ID', templateId, 'uuid');

  const body: IDataObject = {
    lockDurationInSeconds: String(lockDurationInSeconds),
    lockType: 'edit',
    lockedByApp,
  };

  return await docuSignApiRequest.call(ctx, 'POST', `/templates/${templateId}/lock`, body);
}

async function handleTemplateLockGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  validateField('Template ID', templateId, 'uuid');
  return await docuSignApiRequest.call(ctx, 'GET', `/templates/${templateId}/lock`);
}

async function handleTemplateLockUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  const lockToken = ctx.getNodeParameter('lockToken', itemIndex) as string;
  const lockDurationInSeconds = ctx.getNodeParameter('lockDurationInSeconds', itemIndex, 300) as number;

  validateField('Template ID', templateId, 'uuid');
  validateField('Lock Token', lockToken, 'required');

  const headers: Record<string, string> = {
    'X-DocuSign-Edit': JSON.stringify({
      LockToken: lockToken,
      LockDurationInSeconds: String(lockDurationInSeconds),
    }),
  };

  return await docuSignApiRequest.call(
    ctx,
    'PUT',
    `/templates/${templateId}/lock`,
    {
      lockDurationInSeconds: String(lockDurationInSeconds),
      lockType: 'edit',
    },
    {},
    undefined,
    headers,
  );
}

async function handleTemplateLockDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  const lockToken = ctx.getNodeParameter('lockToken', itemIndex) as string;

  validateField('Template ID', templateId, 'uuid');
  validateField('Lock Token', lockToken, 'required');

  const headers: Record<string, string> = {
    'X-DocuSign-Edit': JSON.stringify({
      LockToken: lockToken,
    }),
  };

  return await docuSignApiRequest.call(
    ctx,
    'DELETE',
    `/templates/${templateId}/lock`,
    undefined,
    {},
    undefined,
    headers,
  );
}

// ============================================================================
// Template Notification Handlers
// ============================================================================

async function handleTemplateNotificationGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  validateField('Template ID', templateId, 'uuid');
  return await docuSignApiRequest.call(ctx, 'GET', `/templates/${templateId}/notification`);
}

async function handleTemplateNotificationUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  const useAccountDefaults = ctx.getNodeParameter('useAccountDefaults', itemIndex, false) as boolean;
  const reminderSettings = ctx.getNodeParameter('reminderSettings', itemIndex, {}) as IDataObject;
  const expirationSettings = ctx.getNodeParameter('expirationSettings', itemIndex, {}) as IDataObject;

  validateField('Template ID', templateId, 'uuid');

  const body: IDataObject = {
    useAccountDefaults: useAccountDefaults ? 'true' : 'false',
  };

  if (!useAccountDefaults && reminderSettings.reminderEnabled) {
    body.reminders = {
      reminderEnabled: 'true',
      reminderDelay: String(reminderSettings.reminderDelay ?? 2),
      reminderFrequency: String(reminderSettings.reminderFrequency ?? 1),
    };
  }

  if (!useAccountDefaults && expirationSettings.expireEnabled) {
    body.expirations = {
      expireEnabled: 'true',
      expireAfter: String(expirationSettings.expireAfter ?? 120),
      expireWarn: String(expirationSettings.expireWarn ?? 3),
    };
  }

  return await docuSignApiRequest.call(ctx, 'PUT', `/templates/${templateId}/notification`, body);
}

// ============================================================================
// Billing Handlers
// ============================================================================

async function handleBillingGetPlan(
  ctx: IExecuteFunctions,
): Promise<IDataObject> {
  return await docuSignApiRequest.call(ctx, 'GET', '/billing_plan');
}

async function handleBillingGetAllInvoices(
  ctx: IExecuteFunctions,
): Promise<IDataObject> {
  return await docuSignApiRequest.call(ctx, 'GET', '/billing_invoices');
}

async function handleBillingGetInvoice(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const invoiceId = ctx.getNodeParameter('invoiceId', itemIndex) as string;
  validateField('Invoice ID', invoiceId, 'required');
  return await docuSignApiRequest.call(ctx, 'GET', `/billing_invoices/${invoiceId}`);
}

async function handleBillingGetAllPayments(
  ctx: IExecuteFunctions,
): Promise<IDataObject> {
  return await docuSignApiRequest.call(ctx, 'GET', '/billing_payments');
}

async function handleBillingGetPayment(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const paymentId = ctx.getNodeParameter('paymentId', itemIndex) as string;
  validateField('Payment ID', paymentId, 'required');
  return await docuSignApiRequest.call(ctx, 'GET', `/billing_payments/${paymentId}`);
}

// ============================================================================
// Cloud Storage Handlers
// ============================================================================

async function handleCloudStorageListProviders(
  ctx: IExecuteFunctions,
): Promise<IDataObject> {
  return await docuSignApiRequest.call(ctx, 'GET', '/cloud_storage');
}

async function handleCloudStorageListFiles(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const serviceId = ctx.getNodeParameter('serviceId', itemIndex) as string;
  const additionalOptions = ctx.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;
  validateField('Service ID', serviceId, 'required');

  let endpoint = `/cloud_storage/${encodeURIComponent(serviceId)}/folders`;
  if (additionalOptions.rootFolderId) {
    endpoint += `/${encodeURIComponent(String(additionalOptions.rootFolderId))}`;
  }
  return await docuSignApiRequest.call(ctx, 'GET', endpoint);
}

async function handleCloudStorageGetFile(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const serviceId = ctx.getNodeParameter('serviceId', itemIndex) as string;
  const folderId = ctx.getNodeParameter('folderId', itemIndex) as string;
  validateField('Service ID', serviceId, 'required');
  validateField('Folder ID', folderId, 'required');
  return await docuSignApiRequest.call(ctx, 'GET', `/cloud_storage/${encodeURIComponent(serviceId)}/folders/${encodeURIComponent(folderId)}`);
}

// ============================================================================
// Workspace Handlers
// ============================================================================

async function handleWorkspaceCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const workspaceName = ctx.getNodeParameter('workspaceName', itemIndex) as string;
  validateField('Workspace Name', workspaceName, 'required');
  return await docuSignApiRequest.call(ctx, 'POST', '/workspaces', { workspaceName });
}

async function handleWorkspaceGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const workspaceId = ctx.getNodeParameter('workspaceId', itemIndex) as string;
  validateField('Workspace ID', workspaceId, 'required');
  return await docuSignApiRequest.call(ctx, 'GET', `/workspaces/${workspaceId}`);
}

async function handleWorkspaceGetAll(
  ctx: IExecuteFunctions,
): Promise<IDataObject> {
  return await docuSignApiRequest.call(ctx, 'GET', '/workspaces');
}

async function handleWorkspaceDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const workspaceId = ctx.getNodeParameter('workspaceId', itemIndex) as string;
  validateField('Workspace ID', workspaceId, 'required');
  return await docuSignApiRequest.call(ctx, 'DELETE', `/workspaces/${workspaceId}`);
}

async function handleWorkspaceCreateFile(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const workspaceId = ctx.getNodeParameter('workspaceId', itemIndex) as string;
  const folderId = ctx.getNodeParameter('folderId', itemIndex) as string;
  const fileName = ctx.getNodeParameter('fileName', itemIndex) as string;
  const fileContent = ctx.getNodeParameter('fileContent', itemIndex) as string;

  validateField('Workspace ID', workspaceId, 'required');
  validateField('Folder ID', folderId, 'required');
  validateField('File Name', fileName, 'required');
  validateField('File Content', fileContent, 'required');
  validateField('File Content', fileContent, 'base64');

  return await docuSignApiRequest.call(
    ctx,
    'POST',
    `/workspaces/${workspaceId}/folders/${folderId}/files`,
    { fileBase64: fileContent, fileName },
  );
}

async function handleWorkspaceGetFiles(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const workspaceId = ctx.getNodeParameter('workspaceId', itemIndex) as string;
  const folderId = ctx.getNodeParameter('folderId', itemIndex) as string;
  validateField('Workspace ID', workspaceId, 'required');
  validateField('Folder ID', folderId, 'required');
  return await docuSignApiRequest.call(ctx, 'GET', `/workspaces/${workspaceId}/folders/${folderId}`);
}

// ============================================================================
// Email Archive Handlers
// ============================================================================

async function handleEmailArchiveCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const email = ctx.getNodeParameter('email', itemIndex) as string;
  validateField('Email', email, 'email');
  return await docuSignApiRequest.call(ctx, 'POST', '/email_archive', { bccEmailAddress: email });
}

async function handleEmailArchiveGetAll(
  ctx: IExecuteFunctions,
): Promise<IDataObject> {
  return await docuSignApiRequest.call(ctx, 'GET', '/email_archive');
}

async function handleEmailArchiveDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const bccEmailArchiveId = ctx.getNodeParameter('bccEmailArchiveId', itemIndex) as string;
  validateField('BCC Archive ID', bccEmailArchiveId, 'required');
  return await docuSignApiRequest.call(ctx, 'DELETE', `/email_archive/${bccEmailArchiveId}`);
}

// ============================================================================
// Diagnostics Handlers
// ============================================================================

async function handleDiagnosticsGetSettings(
  ctx: IExecuteFunctions,
): Promise<IDataObject> {
  return await docuSignApiRequest.call(ctx, 'GET', '/diagnostics/settings');
}

async function handleDiagnosticsUpdateSettings(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const apiRequestLogging = ctx.getNodeParameter('apiRequestLogging', itemIndex) as boolean;
  return await docuSignApiRequest.call(ctx, 'PUT', '/diagnostics/settings', {
    apiRequestLogging: apiRequestLogging ? 'true' : 'false',
  });
}

async function handleDiagnosticsGetLog(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const requestLogId = ctx.getNodeParameter('requestLogId', itemIndex) as string;
  validateField('Request Log ID', requestLogId, 'required');
  return await docuSignApiRequest.call(ctx, 'GET', `/diagnostics/request_logs/${requestLogId}`);
}

// ============================================================================
// Notary Handlers
// ============================================================================

async function handleNotaryGet(
  ctx: IExecuteFunctions,
): Promise<IDataObject> {
  return await docuSignApiRequest.call(ctx, 'GET', '/notary');
}

async function handleNotaryGetJurisdictions(
  ctx: IExecuteFunctions,
): Promise<IDataObject> {
  return await docuSignApiRequest.call(ctx, 'GET', '/notary/jurisdictions');
}

async function handleNotaryCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const firstName = ctx.getNodeParameter('firstName', itemIndex) as string;
  const lastName = ctx.getNodeParameter('lastName', itemIndex) as string;
  const email = ctx.getNodeParameter('email', itemIndex) as string;
  const additionalFields = ctx.getNodeParameter('additionalFields', itemIndex, {});

  validateField('First Name', firstName, 'required');
  validateField('Last Name', lastName, 'required');
  validateField('Email', email, 'email');

  const body: IDataObject = { firstName, lastName, email };
  const extras = additionalFields;
  if (extras.commissionNumber) { body.commissionNumber = extras.commissionNumber; }
  if (extras.commissionExpiry) { body.commissionExpiry = extras.commissionExpiry; }
  if (extras.county) { body.county = extras.county; }
  if (extras.stateCode) { body.stateCode = extras.stateCode; }

  return await docuSignApiRequest.call(ctx, 'POST', '/notary', body);
}

// ============================================================================
// Trust Service Provider Handler
// ============================================================================

async function handleTrustServiceProviderGetSealProviders(
  ctx: IExecuteFunctions,
): Promise<IDataObject> {
  return await docuSignApiRequest.call(ctx, 'GET', '/trust_service_providers/seal/providers');
}

// ============================================================================
// Envelope Purge Handler
// ============================================================================

async function handleEnvelopePurge(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const purgeState = ctx.getNodeParameter('purgeState', itemIndex) as string;
  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Purge State', purgeState, 'required');
  return await docuSignApiRequest.call(ctx, 'PUT', `/envelopes/${envelopeId}`, { purgeState });
}

// ============================================================================
// Account Settings Handlers
// ============================================================================

async function handleAccountSettingsGet(
  ctx: IExecuteFunctions,
): Promise<IDataObject> {
  return await docuSignApiRequest.call(ctx, 'GET', '/settings');
}

async function handleAccountSettingsUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const settingsJson = ctx.getNodeParameter('settingsJson', itemIndex) as string;
  validateField('Settings JSON', settingsJson, 'required');
  let settings: IDataObject;
  try {
    settings = JSON.parse(settingsJson) as IDataObject;
  } catch {
    throw new Error('Invalid JSON in settings');
  }
  return await docuSignApiRequest.call(ctx, 'PUT', '/settings', { accountSettings: settings });
}

// ============================================================================
// Template Views Handler
// ============================================================================

async function handleTemplateViewCreateEditView(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  const returnUrl = ctx.getNodeParameter('returnUrl', itemIndex) as string;
  validateField('Template ID', templateId, 'uuid');
  validateField('Return URL', returnUrl, 'httpsUrl');
  return await docuSignApiRequest.call(ctx, 'POST', `/templates/${templateId}/views/edit`, { returnUrl });
}

// ============================================================================
// Reporting Handlers
// ============================================================================

async function handleReportingGetProductPermissionProfiles(
  ctx: IExecuteFunctions,
): Promise<IDataObject> {
  return await docuSignApiRequest.call(ctx, 'GET', '/reports/product_permission_profiles');
}

async function handleReportingGetReportInAccount(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const startDate = ctx.getNodeParameter('startDate', itemIndex, '') as string;
  const endDate = ctx.getNodeParameter('endDate', itemIndex, '') as string;
  const qs: Record<string, string | number> = {};
  if (startDate) {
    validateField('Start Date', startDate, 'date');
    qs.start_date = startDate;
  }
  if (endDate) {
    validateField('End Date', endDate, 'date');
    qs.end_date = endDate;
  }
  return await docuSignApiRequest.call(ctx, 'GET', '/reports', undefined, qs);
}

// ============================================================================
// Account Signature Handlers
// ============================================================================

async function handleAccountSignatureCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const signatureName = ctx.getNodeParameter('signatureName', itemIndex) as string;
  const signatureInitials = ctx.getNodeParameter('signatureInitials', itemIndex, '') as string;
  validateField('Signature Name', signatureName, 'required');
  const body: IDataObject = { signatureName };
  if (signatureInitials) {
    body.signatureInitials = signatureInitials;
  }
  return await docuSignApiRequest.call(ctx, 'POST', '/signatures', { userSignatures: [body] });
}

async function handleAccountSignatureGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const signatureId = ctx.getNodeParameter('signatureId', itemIndex) as string;
  validateField('Signature ID', signatureId, 'required');
  return await docuSignApiRequest.call(ctx, 'GET', `/signatures/${signatureId}`);
}

async function handleAccountSignatureGetAll(
  ctx: IExecuteFunctions,
): Promise<IDataObject> {
  return await docuSignApiRequest.call(ctx, 'GET', '/signatures');
}

async function handleAccountSignatureUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const signatureId = ctx.getNodeParameter('signatureId', itemIndex) as string;
  const updateFields = ctx.getNodeParameter('updateFields', itemIndex, {});
  validateField('Signature ID', signatureId, 'required');
  if (!updateFields || Object.keys(updateFields).length === 0) {
    throw new Error('At least one update field is required');
  }
  const body: IDataObject = {};
  if (updateFields.signatureName) {
    body.signatureName = updateFields.signatureName;
  }
  if (updateFields.signatureInitials) {
    body.signatureInitials = updateFields.signatureInitials;
  }
  return await docuSignApiRequest.call(ctx, 'PUT', `/signatures/${signatureId}`, body);
}

async function handleAccountSignatureDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const signatureId = ctx.getNodeParameter('signatureId', itemIndex) as string;
  validateField('Signature ID', signatureId, 'required');
  return await docuSignApiRequest.call(ctx, 'DELETE', `/signatures/${signatureId}`);
}

// ============================================================================
// Account Watermark Handlers
// ============================================================================

function buildWatermarkBody(ctx: IExecuteFunctions, itemIndex: number): IDataObject {
  const enabled = ctx.getNodeParameter('enabled', itemIndex, true) as boolean;
  const watermarkText = ctx.getNodeParameter('watermarkText', itemIndex, 'DRAFT') as string;
  const font = ctx.getNodeParameter('font', itemIndex, 'Arial') as string;
  const fontSize = ctx.getNodeParameter('fontSize', itemIndex, '48') as string;
  const fontColor = ctx.getNodeParameter('fontColor', itemIndex, '#999999') as string;
  return { enabled: enabled ? 'true' : 'false', watermarkText, font, fontSize, fontColor };
}

async function handleAccountWatermarkGet(
  ctx: IExecuteFunctions,
): Promise<IDataObject> {
  return await docuSignApiRequest.call(ctx, 'GET', '/watermark');
}

async function handleAccountWatermarkUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const body: IDataObject = buildWatermarkBody(ctx, itemIndex);
  return await docuSignApiRequest.call(ctx, 'PUT', '/watermark', body);
}

async function handleAccountWatermarkPreview(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const body: IDataObject = buildWatermarkBody(ctx, itemIndex);
  return await docuSignApiRequest.call(ctx, 'PUT', '/watermark/preview', body);
}

// ============================================================================
// Captive Recipient Handlers
// ============================================================================

async function handleCaptiveRecipientCreate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const signerEmail = ctx.getNodeParameter('signerEmail', itemIndex) as string;
  const signerName = ctx.getNodeParameter('signerName', itemIndex) as string;
  const clientUserId = ctx.getNodeParameter('clientUserId', itemIndex) as string;
  validateField('Signer Email', signerEmail, 'email');
  validateField('Signer Name', signerName, 'required');
  validateField('Client User ID', clientUserId, 'required');
  return await docuSignApiRequest.call(ctx, 'POST', '/captive_recipients/signature', {
    signers: [{ email: signerEmail, userName: signerName, clientUserId }],
  });
}

async function handleCaptiveRecipientDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const signerEmail = ctx.getNodeParameter('signerEmail', itemIndex) as string;
  validateField('Signer Email', signerEmail, 'email');
  return await docuSignApiRequest.call(ctx, 'DELETE', '/captive_recipients/signature', {
    signers: [{ email: signerEmail }],
  });
}

// ============================================================================
// Consumer Disclosure Handlers
// ============================================================================

async function handleConsumerDisclosureGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const envelopeId = ctx.getNodeParameter('envelopeId', itemIndex) as string;
  const recipientId = ctx.getNodeParameter('recipientId', itemIndex) as string;
  const langCode = ctx.getNodeParameter('langCode', itemIndex, 'en') as string;
  validateField('Envelope ID', envelopeId, 'uuid');
  validateField('Recipient ID', recipientId, 'required');
  return await docuSignApiRequest.call(ctx, 'GET', `/envelopes/${envelopeId}/recipients/${recipientId}/consumer_disclosure/${encodeURIComponent(langCode)}`);
}

async function handleConsumerDisclosureGetDefault(
  ctx: IExecuteFunctions,
): Promise<IDataObject> {
  return await docuSignApiRequest.call(ctx, 'GET', '/consumer_disclosure');
}

async function handleConsumerDisclosureUpdate(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const langCode = ctx.getNodeParameter('langCode', itemIndex, 'en') as string;
  const esignAgreement = ctx.getNodeParameter('esignAgreement', itemIndex, '') as string;
  const companyName = ctx.getNodeParameter('companyName', itemIndex, '') as string;
  const body: IDataObject = {};
  if (esignAgreement) {
    body.esignAgreement = esignAgreement;
  }
  if (companyName) {
    body.companyName = companyName;
  }
  return await docuSignApiRequest.call(ctx, 'PUT', `/consumer_disclosure/${encodeURIComponent(langCode)}`, body);
}

// ============================================================================
// Notary Journal Handlers
// ============================================================================

async function handleNotaryJournalGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const journalId = ctx.getNodeParameter('journalId', itemIndex) as string;
  validateField('Journal ID', journalId, 'required');
  return await docuSignApiRequest.call(ctx, 'GET', `/notary/journals/${journalId}`);
}

async function handleNotaryJournalGetAll(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const returnAll = ctx.getNodeParameter('returnAll', itemIndex, false) as boolean;
  if (returnAll) {
    return await docuSignApiRequestAllItems.call(ctx, 'GET', '/notary/journals', 'notaryJournals') as unknown as IDataObject;
  }
  const limit = ctx.getNodeParameter('limit', itemIndex, 50);
  return await docuSignApiRequest.call(ctx, 'GET', '/notary/journals', undefined, { count: limit });
}

// ============================================================================
// Template Bulk Recipient Handlers
// ============================================================================

async function handleTemplateBulkRecipientUpload(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  const recipientId = ctx.getNodeParameter('recipientId', itemIndex) as string;
  const csvContent = ctx.getNodeParameter('csvContent', itemIndex) as string;
  validateField('Template ID', templateId, 'uuid');
  validateField('Recipient ID', recipientId, 'required');
  validateField('CSV Content', csvContent, 'required');

  const authType = ctx.getNodeParameter('authentication', 0, 'jwt') as string;
  const credentialName = authType === 'oauth2' ? 'docuSignOAuth2Api' : 'docuSignApi';
  const credentials = await ctx.getCredentials(credentialName);
  const environment = credentials.environment as string;
  const region = (credentials.region as string) || 'na';
  const accountId = credentials.accountId as string;
  const baseUrl = getBaseUrl(environment, region);

  return (await ctx.helpers.httpRequestWithAuthentication.call(ctx, credentialName, {
    method: 'PUT',
    url: `${baseUrl}/accounts/${accountId}/templates/${templateId}/recipients/${recipientId}/bulk_recipients`,
    body: csvContent,
    headers: { 'Content-Type': 'text/csv' },
  })) as IDataObject;
}

async function handleTemplateBulkRecipientGet(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  const recipientId = ctx.getNodeParameter('recipientId', itemIndex) as string;
  validateField('Template ID', templateId, 'uuid');
  validateField('Recipient ID', recipientId, 'required');
  return await docuSignApiRequest.call(ctx, 'GET', `/templates/${templateId}/recipients/${recipientId}/bulk_recipients`);
}

async function handleTemplateBulkRecipientDelete(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const templateId = ctx.getNodeParameter('templateId', itemIndex) as string;
  const recipientId = ctx.getNodeParameter('recipientId', itemIndex) as string;
  validateField('Template ID', templateId, 'uuid');
  validateField('Recipient ID', recipientId, 'required');
  return await docuSignApiRequest.call(ctx, 'DELETE', `/templates/${templateId}/recipients/${recipientId}/bulk_recipients`);
}


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
        displayOptions: {
          show: {
            authentication: ['jwt'],
          },
        },
      },
      {
        name: 'docuSignOAuth2Api',
        required: true,
        displayOptions: {
          show: {
            authentication: ['oauth2'],
          },
        },
      },
    ],
    properties: [
      {
        displayName: 'Authentication',
        name: 'authentication',
        type: 'options',
        options: [
          { name: 'JWT (Service Integration)', value: 'jwt' },
          { name: 'OAuth2 (User Authorization)', value: 'oauth2' },
        ],
        default: 'jwt',
      },
      resourceProperty,
      ...allOperations,
      ...allFields,
    ],
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

            case 'getFormData':
              responseData = await handleEnvelopeGetFormData(this, i);
              break;

            case 'createSenderView':
              responseData = await handleEnvelopeCreateSenderView(this, i);
              break;

            case 'createEditView':
              responseData = await handleEnvelopeCreateEditView(this, i);
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
            case 'create':
              responseData = await handleTemplateCreate(this, items, i);
              break;

            case 'get':
              responseData = await handleTemplateGet(this, i);
              break;

            case 'getAll':
              responseData = await handleTemplateGetAll(this, i);
              break;

            case 'update':
              responseData = await handleTemplateUpdate(this, i);
              break;

            case 'delete':
              responseData = await handleTemplateDelete(this, i);
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
        // Bulk Send Resource
        // ==========================================================================
        else if (resource === 'bulkSend') {
          switch (operation) {
            case 'createList':
              responseData = await handleBulkSendCreateList(this, i);
              break;

            case 'get':
              responseData = await handleBulkSendGet(this, i);
              break;

            case 'getAll':
              responseData = await handleBulkSendGetAll(this, i);
              break;

            case 'deleteList':
              responseData = await handleBulkSendDeleteList(this, i);
              break;

            case 'send':
              responseData = await handleBulkSendSend(this, i);
              break;

            case 'getBatchStatus':
              responseData = await handleBulkSendGetBatchStatus(this, i);
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
        // PowerForm Resource
        // ==========================================================================
        else if (resource === 'powerForm') {
          switch (operation) {
            case 'create':
              responseData = await handlePowerFormCreate(this, i);
              break;

            case 'get':
              responseData = await handlePowerFormGet(this, i);
              break;

            case 'getAll':
              responseData = await handlePowerFormGetAll(this, i);
              break;

            case 'delete':
              responseData = await handlePowerFormDelete(this, i);
              break;

            case 'getFormData':
              responseData = await handlePowerFormGetFormData(this, i);
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
        // Folder Resource
        // ==========================================================================
        else if (resource === 'folder') {
          switch (operation) {
            case 'getAll':
              responseData = await handleFolderGetAll(this);
              break;

            case 'getItems':
              responseData = await handleFolderGetItems(this, i);
              break;

            case 'moveEnvelope':
              responseData = await handleFolderMoveEnvelope(this, i);
              break;

            case 'search':
              responseData = await handleFolderSearch(this, i);
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
        // Envelope Lock Resource
        // ==========================================================================
        else if (resource === 'envelopeLock') {
          switch (operation) {
            case 'create':
              responseData = await handleEnvelopeLockCreate(this, i);
              break;

            case 'get':
              responseData = await handleEnvelopeLockGet(this, i);
              break;

            case 'update':
              responseData = await handleEnvelopeLockUpdate(this, i);
              break;

            case 'delete':
              responseData = await handleEnvelopeLockDelete(this, i);
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
        // Document Generation Resource
        // ==========================================================================
        else if (resource === 'documentGeneration') {
          switch (operation) {
            case 'getFormFields':
              responseData = await handleDocGenGetFormFields(this, i);
              break;

            case 'updateFormFields':
              responseData = await handleDocGenUpdateFormFields(this, i);
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
        // Signing Group Resource
        // ==========================================================================
        else if (resource === 'signingGroup') {
          switch (operation) {
            case 'create':
              responseData = await handleSigningGroupCreate(this, i);
              break;

            case 'get':
              responseData = await handleSigningGroupGet(this, i);
              break;

            case 'getAll':
              responseData = await handleSigningGroupGetAll(this, i);
              break;

            case 'update':
              responseData = await handleSigningGroupUpdate(this, i);
              break;

            case 'delete':
              responseData = await handleSigningGroupDelete(this, i);
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
        // Brand Resource
        // ==========================================================================
        else if (resource === 'brand') {
          switch (operation) {
            case 'create':
              responseData = await handleBrandCreate(this, i);
              break;

            case 'get':
              responseData = await handleBrandGet(this, i);
              break;

            case 'getAll':
              responseData = await handleBrandGetAll(this, i);
              break;

            case 'update':
              responseData = await handleBrandUpdate(this, i);
              break;

            case 'delete':
              responseData = await handleBrandDelete(this, i);
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
        // Recipient Tabs Resource
        // ==========================================================================
        else if (resource === 'recipientTabs') {
          switch (operation) {
            case 'get':
              responseData = await handleRecipientTabsGet(this, i);
              break;

            case 'update':
              responseData = await handleRecipientTabsUpdate(this, i);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        }

        // ==========================================================================
        // Comments Resource
        // ==========================================================================
        else if (resource === 'comments') {
          switch (operation) {
            case 'create':
              responseData = await handleCommentsCreate(this, i);
              break;

            case 'getAll':
              responseData = await handleCommentsGetAll(this, i);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        }

        // ==========================================================================
        // Account User Resource
        // ==========================================================================
        else if (resource === 'accountUser') {
          switch (operation) {
            case 'create':
              responseData = await handleAccountUserCreate(this, i);
              break;

            case 'get':
              responseData = await handleAccountUserGet(this, i);
              break;

            case 'getAll':
              responseData = await handleAccountUserGetAll(this, i);
              break;

            case 'update':
              responseData = await handleAccountUserUpdate(this, i);
              break;

            case 'delete':
              responseData = await handleAccountUserDelete(this, i);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        }

        // ==========================================================================
        // Account Group Resource
        // ==========================================================================
        else if (resource === 'accountGroup') {
          switch (operation) {
            case 'create':
              responseData = await handleAccountGroupCreate(this, i);
              break;

            case 'getAll':
              responseData = await handleAccountGroupGetAll(this, i);
              break;

            case 'update':
              responseData = await handleAccountGroupUpdate(this, i);
              break;

            case 'delete':
              responseData = await handleAccountGroupDelete(this, i);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        }

        // ==========================================================================
        // Connect Configuration Resource
        // ==========================================================================
        else if (resource === 'connectConfig') {
          switch (operation) {
            case 'create':
              responseData = await handleConnectConfigCreate(this, i);
              break;

            case 'get':
              responseData = await handleConnectConfigGet(this, i);
              break;

            case 'getAll':
              responseData = await handleConnectConfigGetAll(this, i);
              break;

            case 'update':
              responseData = await handleConnectConfigUpdate(this, i);
              break;

            case 'delete':
              responseData = await handleConnectConfigDelete(this, i);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        }

        // ==========================================================================
        // Composite Template Resource
        // ==========================================================================
        else if (resource === 'compositeTemplate') {
          switch (operation) {
            case 'createEnvelope':
              responseData = await handleCompositeTemplateCreateEnvelope(this, i);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        }

        // ==========================================================================
        // Payment Tab Resource
        // ==========================================================================
        else if (resource === 'paymentTab') {
          switch (operation) {
            case 'createEnvelope':
              responseData = await handlePaymentTabCreateEnvelope(this, i);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        }

        // ==========================================================================
        // Supplemental Document Resource
        // ==========================================================================
        else if (resource === 'supplementalDoc') {
          switch (operation) {
            case 'addToEnvelope':
              responseData = await handleSupplementalDocAdd(this, items, i);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        }

        // ==========================================================================
        // Envelope Transfer Resource
        // ==========================================================================
        else if (resource === 'envelopeTransfer') {
          switch (operation) {
            case 'getRules':
              responseData = await handleEnvelopeTransferGetRules(this);
              break;

            case 'createRule':
              responseData = await handleEnvelopeTransferCreateRule(this, i);
              break;

            case 'updateRule':
              responseData = await handleEnvelopeTransferUpdateRule(this, i);
              break;

            case 'deleteRule':
              responseData = await handleEnvelopeTransferDeleteRule(this, i);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        }

        // ==========================================================================
        // Template Recipients Resource
        // ==========================================================================
        else if (resource === 'templateRecipients') {
          switch (operation) {
            case 'create':
              responseData = await handleTemplateRecipientsCreate(this, i);
              break;

            case 'getAll':
              responseData = await handleTemplateRecipientsGetAll(this, i);
              break;

            case 'update':
              responseData = await handleTemplateRecipientsUpdate(this, i);
              break;

            case 'delete':
              responseData = await handleTemplateRecipientsDelete(this, i);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        }

        // ==========================================================================
        // Scheduled Routing Resource
        // ==========================================================================
        else if (resource === 'scheduledRouting') {
          switch (operation) {
            case 'get':
              responseData = await handleScheduledRoutingGet(this, i);
              break;

            case 'update':
              responseData = await handleScheduledRoutingUpdate(this, i);
              break;

            case 'delete':
              responseData = await handleScheduledRoutingDelete(this, i);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        }

        // ==========================================================================
        // Chunked Upload Resource
        // ==========================================================================
        else if (resource === 'chunkedUpload') {
          switch (operation) {
            case 'initiate':
              responseData = await handleChunkedUploadInitiate(this, i);
              break;

            case 'uploadChunk':
              responseData = await handleChunkedUploadChunk(this, i);
              break;

            case 'commit':
              responseData = await handleChunkedUploadCommit(this, i);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        }

        // ==========================================================================
        // ID Verification Resource
        // ==========================================================================
        else if (resource === 'idVerification') {
          switch (operation) {
            case 'getWorkflows':
              responseData = await handleIdVerificationGetWorkflows(this);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        }

        // ==========================================================================
        // Envelope Custom Field Resource
        // ==========================================================================
        else if (resource === 'envelopeCustomField') {
          switch (operation) {
            case 'create':
              responseData = await handleEnvelopeCustomFieldCreate(this, i);
              break;

            case 'get':
              responseData = await handleEnvelopeCustomFieldGet(this, i);
              break;

            case 'update':
              responseData = await handleEnvelopeCustomFieldUpdate(this, i);
              break;

            case 'delete':
              responseData = await handleEnvelopeCustomFieldDelete(this, i);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        }

        // ==========================================================================
        // Envelope Attachment Resource
        // ==========================================================================
        else if (resource === 'envelopeAttachment') {
          switch (operation) {
            case 'getAll':
              responseData = await handleEnvelopeAttachmentGetAll(this, i);
              break;

            case 'create':
              responseData = await handleEnvelopeAttachmentCreate(this, i);
              break;

            case 'delete':
              responseData = await handleEnvelopeAttachmentDelete(this, i);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        }

        // ==========================================================================
        // Envelope Document Field Resource
        // ==========================================================================
        else if (resource === 'envelopeDocumentField') {
          switch (operation) {
            case 'get':
              responseData = await handleEnvelopeDocumentFieldGet(this, i);
              break;

            case 'create':
              responseData = await handleEnvelopeDocumentFieldCreate(this, i);
              break;

            case 'update':
              responseData = await handleEnvelopeDocumentFieldUpdate(this, i);
              break;

            case 'delete':
              responseData = await handleEnvelopeDocumentFieldDelete(this, i);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        }

        // ==========================================================================
        // Envelope Email Setting Resource
        // ==========================================================================
        else if (resource === 'envelopeEmailSetting') {
          switch (operation) {
            case 'get':
              responseData = await handleEnvelopeEmailSettingGet(this, i);
              break;

            case 'create':
              responseData = await handleEnvelopeEmailSettingCreate(this, i);
              break;

            case 'update':
              responseData = await handleEnvelopeEmailSettingUpdate(this, i);
              break;

            case 'delete':
              responseData = await handleEnvelopeEmailSettingDelete(this, i);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        }

        // ==========================================================================
        // Custom Tab Resource
        // ==========================================================================
        else if (resource === 'customTab') {
          switch (operation) {
            case 'create':
              responseData = await handleCustomTabCreate(this, i);
              break;

            case 'get':
              responseData = await handleCustomTabGet(this, i);
              break;

            case 'getAll':
              responseData = await handleCustomTabGetAll(this, i);
              break;

            case 'update':
              responseData = await handleCustomTabUpdate(this, i);
              break;

            case 'delete':
              responseData = await handleCustomTabDelete(this, i);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        }

        // ==========================================================================
        // Contact Resource
        // ==========================================================================
        else if (resource === 'contact') {
          switch (operation) {
            case 'create':
              responseData = await handleContactCreate(this, i);
              break;

            case 'getAll':
              responseData = await handleContactGetAll(this, i);
              break;

            case 'update':
              responseData = await handleContactUpdate(this, i);
              break;

            case 'delete':
              responseData = await handleContactDelete(this, i);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        }

        // ==========================================================================
        // Permission Profile Resource
        // ==========================================================================
        else if (resource === 'permissionProfile') {
          switch (operation) {
            case 'create':
              responseData = await handlePermissionProfileCreate(this, i);
              break;

            case 'get':
              responseData = await handlePermissionProfileGet(this, i);
              break;

            case 'getAll':
              responseData = await handlePermissionProfileGetAll(this, i);
              break;

            case 'update':
              responseData = await handlePermissionProfileUpdate(this, i);
              break;

            case 'delete':
              responseData = await handlePermissionProfileDelete(this, i);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        }

        // ==========================================================================
        // Account Custom Field Resource
        // ==========================================================================
        else if (resource === 'accountCustomField') {
          switch (operation) {
            case 'create':
              responseData = await handleAccountCustomFieldCreate(this, i);
              break;

            case 'getAll':
              responseData = await handleAccountCustomFieldGetAll(this);
              break;

            case 'update':
              responseData = await handleAccountCustomFieldUpdate(this, i);
              break;

            case 'delete':
              responseData = await handleAccountCustomFieldDelete(this, i);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        }

        // ==========================================================================
        // Connect Event Resource
        // ==========================================================================
        else if (resource === 'connectEvent') {
          switch (operation) {
            case 'getFailures':
              responseData = await handleConnectEventGetFailures(this, i);
              break;

            case 'getLogs':
              responseData = await handleConnectEventGetLogs(this, i);
              break;

            case 'retry':
              responseData = await handleConnectEventRetry(this, i);
              break;

            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'envelopeNotification') {
          switch (operation) {
            case 'get':
              responseData = await handleEnvelopeNotificationGet(this, i);
              break;
            case 'update':
              responseData = await handleEnvelopeNotificationUpdate(this, i);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'templateDocument') {
          switch (operation) {
            case 'get': {
              const result = await handleTemplateDocumentGet(this, i);
              const binaryResult = result as unknown as { binary: IBinaryData; templateId: string; documentId: string };
              if (binaryResult.binary) {
                returnData.push({
                  json: { templateId: binaryResult.templateId, documentId: binaryResult.documentId, success: true },
                  binary: { data: binaryResult.binary },
                  pairedItem: { item: i },
                });
                continue;
              }
              responseData = result;
              break;
            }
            case 'getAll':
              responseData = await handleTemplateDocumentGetAll(this, i);
              break;
            case 'add':
              responseData = await handleTemplateDocumentAdd(this, i);
              break;
            case 'remove':
              responseData = await handleTemplateDocumentRemove(this, i);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'templateCustomField') {
          switch (operation) {
            case 'create':
              responseData = await handleTemplateCustomFieldCreate(this, i);
              break;
            case 'get':
              responseData = await handleTemplateCustomFieldGet(this, i);
              break;
            case 'update':
              responseData = await handleTemplateCustomFieldUpdate(this, i);
              break;
            case 'delete':
              responseData = await handleTemplateCustomFieldDelete(this, i);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'templateLock') {
          switch (operation) {
            case 'create':
              responseData = await handleTemplateLockCreate(this, i);
              break;
            case 'get':
              responseData = await handleTemplateLockGet(this, i);
              break;
            case 'update':
              responseData = await handleTemplateLockUpdate(this, i);
              break;
            case 'delete':
              responseData = await handleTemplateLockDelete(this, i);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'templateNotification') {
          switch (operation) {
            case 'get':
              responseData = await handleTemplateNotificationGet(this, i);
              break;
            case 'update':
              responseData = await handleTemplateNotificationUpdate(this, i);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'billing') {
          switch (operation) {
            case 'getPlan':
              responseData = await handleBillingGetPlan(this);
              break;
            case 'getAllInvoices':
              responseData = await handleBillingGetAllInvoices(this);
              break;
            case 'getInvoice':
              responseData = await handleBillingGetInvoice(this, i);
              break;
            case 'getAllPayments':
              responseData = await handleBillingGetAllPayments(this);
              break;
            case 'getPayment':
              responseData = await handleBillingGetPayment(this, i);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'cloudStorage') {
          switch (operation) {
            case 'listProviders':
              responseData = await handleCloudStorageListProviders(this);
              break;
            case 'listFiles':
              responseData = await handleCloudStorageListFiles(this, i);
              break;
            case 'getFile':
              responseData = await handleCloudStorageGetFile(this, i);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'workspace') {
          switch (operation) {
            case 'create':
              responseData = await handleWorkspaceCreate(this, i);
              break;
            case 'get':
              responseData = await handleWorkspaceGet(this, i);
              break;
            case 'getAll':
              responseData = await handleWorkspaceGetAll(this);
              break;
            case 'delete':
              responseData = await handleWorkspaceDelete(this, i);
              break;
            case 'createFile':
              responseData = await handleWorkspaceCreateFile(this, i);
              break;
            case 'getFiles':
              responseData = await handleWorkspaceGetFiles(this, i);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'emailArchive') {
          switch (operation) {
            case 'create':
              responseData = await handleEmailArchiveCreate(this, i);
              break;
            case 'getAll':
              responseData = await handleEmailArchiveGetAll(this);
              break;
            case 'delete':
              responseData = await handleEmailArchiveDelete(this, i);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'diagnostics') {
          switch (operation) {
            case 'getSettings':
              responseData = await handleDiagnosticsGetSettings(this);
              break;
            case 'updateSettings':
              responseData = await handleDiagnosticsUpdateSettings(this, i);
              break;
            case 'getLog':
              responseData = await handleDiagnosticsGetLog(this, i);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'notary') {
          switch (operation) {
            case 'get':
              responseData = await handleNotaryGet(this);
              break;
            case 'getJurisdictions':
              responseData = await handleNotaryGetJurisdictions(this);
              break;
            case 'create':
              responseData = await handleNotaryCreate(this, i);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'trustServiceProvider') {
          switch (operation) {
            case 'getSealProviders':
              responseData = await handleTrustServiceProviderGetSealProviders(this);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'envelopePurge') {
          switch (operation) {
            case 'purgeDocuments':
              responseData = await handleEnvelopePurge(this, i);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'accountSettings') {
          switch (operation) {
            case 'get':
              responseData = await handleAccountSettingsGet(this);
              break;
            case 'update':
              responseData = await handleAccountSettingsUpdate(this, i);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'templateView') {
          switch (operation) {
            case 'createEditView':
              responseData = await handleTemplateViewCreateEditView(this, i);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'reporting') {
          switch (operation) {
            case 'getProductPermissionProfiles':
              responseData = await handleReportingGetProductPermissionProfiles(this);
              break;
            case 'getReportInAccount':
              responseData = await handleReportingGetReportInAccount(this, i);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'accountSignature') {
          switch (operation) {
            case 'create':
              responseData = await handleAccountSignatureCreate(this, i);
              break;
            case 'get':
              responseData = await handleAccountSignatureGet(this, i);
              break;
            case 'getAll':
              responseData = await handleAccountSignatureGetAll(this);
              break;
            case 'update':
              responseData = await handleAccountSignatureUpdate(this, i);
              break;
            case 'delete':
              responseData = await handleAccountSignatureDelete(this, i);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'accountWatermark') {
          switch (operation) {
            case 'get':
              responseData = await handleAccountWatermarkGet(this);
              break;
            case 'update':
              responseData = await handleAccountWatermarkUpdate(this, i);
              break;
            case 'preview':
              responseData = await handleAccountWatermarkPreview(this, i);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'captiveRecipient') {
          switch (operation) {
            case 'create':
              responseData = await handleCaptiveRecipientCreate(this, i);
              break;
            case 'delete':
              responseData = await handleCaptiveRecipientDelete(this, i);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'consumerDisclosure') {
          switch (operation) {
            case 'get':
              responseData = await handleConsumerDisclosureGet(this, i);
              break;
            case 'getDefault':
              responseData = await handleConsumerDisclosureGetDefault(this);
              break;
            case 'update':
              responseData = await handleConsumerDisclosureUpdate(this, i);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'notaryJournal') {
          switch (operation) {
            case 'get':
              responseData = await handleNotaryJournalGet(this, i);
              break;
            case 'getAll':
              responseData = await handleNotaryJournalGetAll(this, i);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
          }
        } else if (resource === 'templateBulkRecipient') {
          switch (operation) {
            case 'upload':
              responseData = await handleTemplateBulkRecipientUpload(this, i);
              break;
            case 'get':
              responseData = await handleTemplateBulkRecipientGet(this, i);
              break;
            case 'delete':
              responseData = await handleTemplateBulkRecipientDelete(this, i);
              break;
            default:
              throw new NodeApiError(this.getNode(), {}, { message: `Unknown operation: ${operation}` });
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
