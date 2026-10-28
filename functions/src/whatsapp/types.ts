export interface WhatsAppMessagePayload {
  to: string // E.164 formatted phone number with country code, e.g. "+919999999999"
  templateName: string
  languageCode: 'en' | 'hi'
  components: Array<{
    type: 'header' | 'body' | 'button'
    parameters: Array<{
      type: 'text' | 'currency' | 'date_time' | 'image'
      text?: string
      currency?: {
        fallback_value: string
        code: string
        amount_1000: number
      }
      image?: {
        link: string
      }
    }>
  }>
}

export interface WhatsAppSendResult {
  success: boolean
  messageId?: string
  error?: string
  statusCode?: number
  retryable?: boolean
}

export interface IWhatsAppProvider {
  sendTemplateMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppSendResult>
  verifyWebhook(mode: string, token: string, challenge: string): string | null
  processStatusUpdate(body: any): Promise<{ messageId: string; status: 'sent' | 'delivered' | 'read' | 'failed' } | null>
}
