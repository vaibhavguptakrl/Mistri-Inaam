import { IWhatsAppProvider, WhatsAppMessagePayload, WhatsAppSendResult } from './types'

export interface MetaProviderConfig {
  phoneNumberId: string
  accessToken: string
  webhookVerifyToken: string
  apiVersion?: string
}

/**
 * Official Meta WhatsApp Cloud API Provider.
 * Communicates directly with https://graph.facebook.com/{apiVersion}/{phoneNumberId}/messages
 * Includes rate-limiting and exponential back-off retries.
 */
export class MetaCloudApiWhatsAppProvider implements IWhatsAppProvider {
  private config: MetaProviderConfig
  private apiVersion: string

  constructor(config: MetaProviderConfig) {
    this.config = config
    this.apiVersion = config.apiVersion || 'v19.0'
  }

  /**
   * Dispatches an approved template message to the recipient's phone number.
   */
  async sendTemplateMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppSendResult> {
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.config.phoneNumberId}/messages`
    
    // Clean phone number: remove +, spaces, dashes
    const cleanPhone = payload.to.replace(/[^0-9]/g, '')

    const requestBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'template',
      template: {
        name: payload.templateName,
        language: {
          code: payload.languageCode
        },
        components: payload.components
      }
    }

    let attempts = 0
    const maxAttempts = 3
    let delayMs = 1000

    while (attempts < maxAttempts) {
      attempts++
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        })

        const data: any = await response.json()

        if (response.ok) {
          const messageId = data?.messages?.[0]?.id
          return {
            success: true,
            messageId,
            statusCode: response.status
          }
        }

        // Handle Meta error codes
        const error = data?.error
        const isRateLimit = response.status === 429 || error?.code === 131056 || error?.code === 80007
        const isServerError = response.status >= 500

        if ((isRateLimit || isServerError) && attempts < maxAttempts) {
          console.warn(`[WhatsApp API] Attempt ${attempts} failed (${error?.message}). Retrying in ${delayMs}ms...`)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
          delayMs *= 2 // Exponential backoff
          continue
        }

        return {
          success: false,
          error: error?.message || `Meta API error with HTTP ${response.status}`,
          statusCode: response.status,
          retryable: isRateLimit || isServerError
        }
      } catch (err: any) {
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delayMs))
          delayMs *= 2
          continue
        }
        return {
          success: false,
          error: err?.message || 'Network exception calling Meta Cloud API',
          retryable: true
        }
      }
    }

    return {
      success: false,
      error: 'Max retry attempts exhausted',
      retryable: false
    }
  }

  /**
   * Verifies the Meta Webhook setup handshake (GET request from Meta)
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.config.webhookVerifyToken) {
      return challenge
    }
    return null
  }

  /**
   * Processes incoming delivery & read receipts from Meta Webhook (POST request)
   */
  async processStatusUpdate(body: any): Promise<{ messageId: string; status: 'sent' | 'delivered' | 'read' | 'failed' } | null> {
    try {
      const entry = body?.entry?.[0]
      const change = entry?.changes?.[0]
      const statusObj = change?.value?.statuses?.[0]

      if (!statusObj) return null

      const messageId = statusObj.id
      const status = statusObj.status as 'sent' | 'delivered' | 'read' | 'failed'

      if (messageId && status) {
        return { messageId, status }
      }
      return null
    } catch {
      return null
    }
  }
}
