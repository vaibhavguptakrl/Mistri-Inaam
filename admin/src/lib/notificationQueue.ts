import { collection, addDoc } from 'firebase/firestore'
import { db } from './firebase'

export type NotificationEvent =
  | 'points_credited'
  | 'redemption_requested'
  | 'redemption_approved'
  | 'redemption_rejected'
  | 'new_scheme'
  | 'monthly_bonus'

export interface QueueNotificationParams {
  plumberId: string
  event: NotificationEvent
  titleEn: string
  titleHi: string
  bodyEn: string
  bodyHi: string
  variables?: Record<string, any>
}

/**
 * Channel-agnostic notification pipeline:
 * 1. Creates an in-app notification document in "notifications" collection
 * 2. Enqueues a push message in "messageQueue" for background delivery
 * 3. Prepares WhatsApp queue document (ready for when whatsapp.enabled is flipped true)
 */
export async function queueNotification(params: QueueNotificationParams): Promise<void> {
  const now = new Date().toISOString()

  // 1. In-App Notification document for plumber app
  await addDoc(collection(db, 'notifications'), {
    plumberId: params.plumberId,
    event: params.event,
    titleEn: params.titleEn,
    titleHi: params.titleHi,
    bodyEn: params.bodyEn,
    bodyHi: params.bodyHi,
    variables: params.variables || {},
    isRead: false,
    createdAt: now
  })

  // 2. Push Notification Queue item
  await addDoc(collection(db, 'messageQueue'), {
    plumberId: params.plumberId,
    event: params.event,
    channel: 'push',
    templateId: `push_${params.event}`,
    variables: params.variables || {},
    title: params.titleEn,
    body: params.bodyEn,
    status: 'queued',
    attempts: 0,
    createdAt: now
  })

  // 3. WhatsApp Queue item stub (held in 'queued' or 'disabled' state)
  await addDoc(collection(db, 'messageQueue'), {
    plumberId: params.plumberId,
    event: params.event,
    channel: 'whatsapp',
    templateId: `wa_${params.event}`,
    variables: params.variables || {},
    status: 'held_feature_disabled', // Turned on when WhatsApp is live
    attempts: 0,
    createdAt: now
  })
}
