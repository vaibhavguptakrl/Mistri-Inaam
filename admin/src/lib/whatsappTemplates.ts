import { collection, doc, setDoc, getDocs, writeBatch } from 'firebase/firestore'
import { db } from './firebase'

export interface WhatsAppTemplateDefinition {
  id: string
  name: string
  category: 'UTILITY' | 'MARKETING'
  languages: {
    en: {
      header?: string
      body: string
      footer?: string
      exampleVariables: string[]
    }
    hi: {
      header?: string
      body: string
      footer?: string
      exampleVariables: string[]
    }
  }
  status: 'PENDING_SUBMISSION' | 'APPROVED' | 'REJECTED'
}

export const READY_MADE_WHATSAPP_TEMPLATES: WhatsAppTemplateDefinition[] = [
  {
    id: 'wa_points_credited',
    name: 'points_credited_v1',
    category: 'UTILITY',
    languages: {
      en: {
        header: 'Shiv Agency Rewards',
        body: 'Namaste {{1}}! You have earned {{2}} reward points for your purchase of Rs {{3}} at Shiv Agency, Karauli. Your new points balance is {{4}} pts. Thank you for your business!',
        footer: 'Shiv Agency, Karauli',
        exampleVariables: ['Ramesh Kumar', '650', '32,500', '1,150']
      },
      hi: {
        header: 'शिव एजेंसी रिवॉर्ड्स',
        body: 'नमस्ते {{1}}! शिव एजेंसी, करौली से ₹{{3}} की सामग्री खरीद पर आपको {{2}} रिवॉर्ड पॉइंट्स प्राप्त हुए हैं। आपका नया बैलेंस {{4}} पॉइंट्स है। धन्यवाद!',
        footer: 'शिव एजेंसी, करौली',
        exampleVariables: ['रमेश कुमार', '650', '32,500', '1,150']
      }
    },
    status: 'PENDING_SUBMISSION'
  },
  {
    id: 'wa_redemption_approved',
    name: 'redemption_approved_v1',
    category: 'UTILITY',
    languages: {
      en: {
        header: 'Shiv Agency - Redemption Approved',
        body: 'Namaste {{1}}! Your redemption of {{2}} points (Rs {{3}}) via {{4}} has been approved. Reference/UTR: {{5}}. Please check your account/store receipt.',
        footer: 'Shiv Agency, Karauli',
        exampleVariables: ['Ramesh Kumar', '3,000', '3,000', 'UPI Transfer', '234567890123']
      },
      hi: {
        header: 'शिव एजेंसी - रिडेम्पशन स्वीकृत',
        body: 'नमस्ते {{1}}! आपका {{2}} पॉइंट्स (₹{{3}}) का {{4}} रिडेम्पशन स्वीकृत व प्रोसेस कर दिया गया है। संदर्भ/UTR संख्या: {{5}}।',
        footer: 'शिव एजेंसी, करौली',
        exampleVariables: ['रमेश कुमार', '3,000', '3,000', 'UPI ट्रांसफर', '234567890123']
      }
    },
    status: 'PENDING_SUBMISSION'
  },
  {
    id: 'wa_redemption_rejected',
    name: 'redemption_rejected_v1',
    category: 'UTILITY',
    languages: {
      en: {
        header: 'Shiv Agency - Redemption Update',
        body: 'Namaste {{1}}, your redemption request for {{2}} points could not be processed. Reason: {{3}}. Your points remain safe in your account. Please contact shop staff if you have questions.',
        footer: 'Shiv Agency, Karauli',
        exampleVariables: ['Ramesh Kumar', '3,000', 'UPI ID was invalid']
      },
      hi: {
        header: 'शिव एजेंसी - रिडेम्पशन सूचना',
        body: 'नमस्ते {{1}}, आपका {{2}} पॉइंट्स का रिडेम्पशन अनुरोध अस्वीकृत कर दिया गया है। कारण: {{3}}। आपके पॉइंट्स आपके खाते में सुरक्षित हैं। सहायता हेतु संपर्क करें।',
        footer: 'शिव एजेंसी, करौली',
        exampleVariables: ['रमेश कुमार', '3,000', 'अमान्य UPI ID']
      }
    },
    status: 'PENDING_SUBMISSION'
  },
  {
    id: 'wa_new_scheme',
    name: 'new_scheme_promo_v1',
    category: 'MARKETING',
    languages: {
      en: {
        header: 'New Scheme at Shiv Agency!',
        body: 'Namaste {{1}}! {{2}} is now active at Shiv Agency, Karauli: {{3}}. Valid until {{4}}. Buy qualifying plumbing materials and boost your rewards balance today!',
        footer: 'Shiv Agency, Karauli',
        exampleVariables: ['Ramesh Kumar', 'Diwali CPVC Dhamaka', 'Double reward points on all CPVC fittings', '15 Nov 2026']
      },
      hi: {
        header: 'शिव एजेंसी पर नई स्कीम!',
        body: 'नमस्ते {{1}}! शिव एजेंसी करौली पर {{2}} शुरू हो चुकी है: {{3}}। अंतिम तिथि: {{4}}। सामग्री खरीदें और अतिरिक्त रिवॉर्ड पॉइंट्स कमाएं!',
        footer: 'शिव एजेंसी, करौली',
        exampleVariables: ['रमेश कुमार', 'दीपावली CPVC धमाका', 'सभी CPVC फिटिंग्स पर डबल रिवॉर्ड अंक', '15 Nov 2026']
      }
    },
    status: 'PENDING_SUBMISSION'
  },
  {
    id: 'wa_monthly_bonus',
    name: 'monthly_target_bonus_v1',
    category: 'UTILITY',
    languages: {
      en: {
        header: 'Monthly Target Bonus Achieved!',
        body: 'Congratulations {{1}}! You met your monthly purchase target at Shiv Agency and have received {{2}} bonus reward points! Keep up the great work.',
        footer: 'Shiv Agency, Karauli',
        exampleVariables: ['Ramesh Kumar', '250']
      },
      hi: {
        header: 'मासिक लक्ष्य बोनस प्राप्त हुआ!',
        body: 'बधाई हो {{1}}! आपने शिव एजेंसी पर अपना मासिक खरीदारी लक्ष्य पूरा किया है और आपको {{2}} बोनस रिवॉर्ड अंक प्राप्त हुए हैं!',
        footer: 'शिव एजेंसी, करौली',
        exampleVariables: ['रमेश कुमार', '250']
      }
    },
    status: 'PENDING_SUBMISSION'
  }
]

/**
 * Seeds messageTemplates collection in Firestore
 */
export async function seedWhatsAppTemplates(): Promise<void> {
  const batch = writeBatch(db)
  for (const t of READY_MADE_WHATSAPP_TEMPLATES) {
    const ref = doc(db, 'messageTemplates', t.id)
    batch.set(ref, {
      ...t,
      updatedAt: new Date().toISOString()
    })
  }
  await batch.commit()
}
