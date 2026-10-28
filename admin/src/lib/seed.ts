import { doc, setDoc, collection, addDoc, getDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { GeneralSettings, FeatureControls, WhatsAppSettings, PointRule } from '../types'

export const defaultGeneralSettings: GeneralSettings = {
  appName: 'Shiv Agency Loyalty Rewards',
  shopName: 'Shiv Agency',
  shopLocation: 'Near Bus Stand, Karauli, Rajasthan',
  supportPhone: '+91 94140 XXXXX',
  defaultEarnPercent: 1.0,
  rupeeValuePerPoint: 1.0,
  roundingMode: 'floor',
  minRedeemPoints: 3000,
  welcomeBonus: 500,
  referralBonus: 50,
  pointsExpiryMonths: 6,
  weeklyTargetThreshold: 25000,
  weeklyTargetPoints: 200,
  monthlyTargetThreshold: 100000,
  monthlyTargetPoints: 1000,
  festivalMultiplier: 2.0,
  festivalStartDate: '',
  festivalEndDate: '',
  leaderboardRewardText: 'Top 3 plumbers win special toolkit hampers & bonus points every month!',
  showEarningRatesToPlumbers: true,
  showCalculationDetailsToPlumbers: true
}

export const defaultFeatureControls: FeatureControls = {
  welcomeBonus: true,
  referral: true,
  targetBonus: true,
  expiry: true,
  leaderboard: true,
  festivalDoublePoints: false,
  bannerSlider: true,
  redemptionUpi: true,
  redemptionVoucher: true,
  redemptionTools: true,
  qrScanning: false, // Stub for future
  whatsappAuto: false // Disabled Coming Soon
}

export const defaultWhatsAppSettings: WhatsAppSettings = {
  enabled: false,
  provider: 'meta_cloud_api',
  templatesApproved: false,
  comingSoonMessage: 'WhatsApp automatic updates are coming soon! You will be notified when live.'
}

const defaultCategories = [
  'Water Tanks',
  'CPVC Pipes & Fittings',
  'UPVC Pipes & Fittings',
  'SWR Drainage',
  'GI Fittings',
  'Sanitaryware',
  'Bath Fittings & Taps'
]

const defaultBrands = [
  'Ashirvad',
  'Astral',
  'Supreme',
  'Finolex',
  'Prince',
  'Sintex',
  'Jaquar',
  'Cera'
]

const defaultRules: Omit<PointRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Water Tanks (Per Litre)',
    category: 'Water Tanks',
    brand: '',
    calculationType: 'PER_LITRE',
    rate: 0.10, // Rs 0.10 per litre (e.g., 1000L tank = Rs 100 = 100 points)
    minPurchaseAmount: 0,
    isActive: true,
    sortOrder: 1
  },
  {
    name: 'Ashirvad CPVC Special',
    category: 'CPVC Pipes & Fittings',
    brand: 'Ashirvad',
    calculationType: 'PERCENT_OF_AMOUNT',
    rate: 2.0, // 2% of purchase amount
    minPurchaseAmount: 1000,
    isActive: true,
    sortOrder: 2
  },
  {
    name: 'Astral CPVC Premium',
    category: 'CPVC Pipes & Fittings',
    brand: 'Astral',
    calculationType: 'PERCENT_OF_AMOUNT',
    rate: 2.5, // 2.5% of purchase amount
    minPurchaseAmount: 1000,
    isActive: true,
    sortOrder: 3
  },
  {
    name: 'General Sanitaryware',
    category: 'Sanitaryware',
    brand: '',
    calculationType: 'PERCENT_OF_AMOUNT',
    rate: 1.5,
    minPurchaseAmount: 500,
    isActive: true,
    sortOrder: 4
  }
]

export async function seedInitialFirestoreData(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Settings
    await setDoc(doc(db, 'appSettings', 'general'), defaultGeneralSettings, { merge: true })
    await setDoc(doc(db, 'appSettings', 'features'), defaultFeatureControls, { merge: true })
    await setDoc(doc(db, 'appSettings', 'whatsapp'), defaultWhatsAppSettings, { merge: true })

    // 2. Categories
    for (const cat of defaultCategories) {
      const catId = cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      await setDoc(doc(db, 'categories', catId), {
        id: catId,
        name: cat,
        createdAt: new Date().toISOString()
      }, { merge: true })
    }

    // 3. Brands
    for (const b of defaultBrands) {
      const brandId = b.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      await setDoc(doc(db, 'brands', brandId), {
        id: brandId,
        name: b,
        createdAt: new Date().toISOString()
      }, { merge: true })
    }

    // 4. Default Point Rules
    for (const rule of defaultRules) {
      const ruleId = rule.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      await setDoc(doc(db, 'pointRules', ruleId), {
        ...rule,
        id: ruleId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true })
    }

    // 5. Default Scheme / Banner
    await setDoc(doc(db, 'schemes', 'default-scheme'), {
      id: 'default-scheme',
      title: 'Shiv Agency Plumber Mahotsav',
      description: 'Earn double points on all CPVC and Water Tank purchases this season! Contact shop for details.',
      bannerUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 90 * 86400000).toISOString(),
      isActive: true,
      createdAt: new Date().toISOString()
    }, { merge: true })

    return {
      success: true,
      message: 'Initial Firestore settings, categories, brands, and point rules seeded successfully!'
    }
  } catch (error: any) {
    console.error('Error seeding data:', error)
    return {
      success: false,
      message: error?.message || 'Failed to seed initial data'
    }
  }
}
