import { MetaCloudApiWhatsAppProvider } from './metaCloudApiProvider'
import { WhatsAppMessagePayload } from './types'

export interface QueueDocument {
  id: string
  plumberId: string
  channel: 'push' | 'whatsapp'
  event: string
  templateId: string
  variables: Record<string, any>
  status: 'queued' | 'held_feature_disabled' | 'sent' | 'delivered' | 'failed'
  attempts: number
  error?: string
  messageId?: string
}

/**
 * Server-side Queue Processor for WhatsApp Notifications.
 * Runs as a Cloud Function trigger or background cron when Blaze plan is active.
 *
 * Requirements to Go Live:
 * 1. Set appSettings/whatsapp.enabled = true
 * 2. Set environment secrets: WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID
 */
export async function processWhatsAppQueueItem(
  item: QueueDocument,
  plumberPhone: string,
  plumberOptIn: boolean,
  whatsappSettings: { enabled: boolean; phoneNumberId?: string; accessToken?: string; webhookVerifyToken?: string }
): Promise<{ status: QueueDocument['status']; error?: string; messageId?: string }> {
  // 1. Guard: Global Feature Flag
  if (!whatsappSettings.enabled) {
    return {
      status: 'held_feature_disabled',
      error: 'WhatsApp automated messages are disabled in appSettings/whatsapp'
    }
  }

  // 2. Guard: Plumber Consent / Opt-in
  if (!plumberOptIn) {
    return {
      status: 'failed',
      error: 'Plumber has not consented / opted into WhatsApp updates (Meta Policy)'
    }
  }

  // 3. Guard: Phone number
  if (!plumberPhone || plumberPhone.length < 10) {
    return {
      status: 'failed',
      error: 'Invalid or missing plumber phone number'
    }
  }

  // 4. Initialize Provider with secure credentials from Secret Manager / Env
  const token = process.env.WHATSAPP_ACCESS_TOKEN || whatsappSettings.accessToken || ''
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || whatsappSettings.phoneNumberId || ''

  if (!token || !phoneId) {
    return {
      status: 'failed',
      error: 'Meta WhatsApp credentials missing in environment / Google Secret Manager'
    }
  }

  const provider = new MetaCloudApiWhatsAppProvider({
    phoneNumberId: phoneId,
    accessToken: token,
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || whatsappSettings.webhookVerifyToken || 'shiv_agency_verify_token'
  })

  // 5. Convert variables to Meta template component parameters
  const parameters = Object.values(item.variables || {}).map((val) => ({
    type: 'text' as const,
    text: String(val)
  }))

  const payload: WhatsAppMessagePayload = {
    to: plumberPhone,
    templateName: item.templateId.replace('wa_', '') + '_v1',
    languageCode: 'hi', // or dynamically determine based on plumber language
    components: [
      {
        type: 'body',
        parameters
      }
    ]
  }

  // 6. Dispatch
  const result = await provider.sendTemplateMessage(payload)

  if (result.success) {
    return {
      status: 'sent',
      messageId: result.messageId
    }
  } else {
    return {
      status: 'failed',
      error: result.error
    }
  }
}
