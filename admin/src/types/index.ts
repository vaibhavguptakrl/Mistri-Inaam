export type KYCStatus = 'pending' | 'approved' | 'rejected'

export interface Plumber {
  id: string
  name: string
  phone: string
  whatsappNumber: string
  email: string
  panNumber: string
  panCardUrl: string
  aadhaarLast4: string
  aadhaarCardUrl: string
  selfieUrl: string
  referralCode: string
  referredBy?: string
  plumberCode: string
  kycStatus: KYCStatus
  kycRemarks?: string
  pointsBalance: number
  lifetimeEarned: number
  totalRedeemed: number
  language: 'hi' | 'en'
  pinEnabled: boolean
  pinHash?: string
  fcmToken?: string
  whatsappOptIn: boolean
  createdAt: string
  updatedAt: string
}

export type TransactionType =
  | 'purchase'
  | 'welcome_bonus'
  | 'referral'
  | 'target_bonus'
  | 'festival_bonus'
  | 'redemption'
  | 'expiry'
  | 'adjustment'

export type RuleCalculationType = 'PER_LITRE' | 'PERCENT_OF_AMOUNT' | 'FIXED_PER_UNIT' | 'FIXED_POINTS'

export interface TransactionLine {
  category: string
  brand: string
  calculationType: RuleCalculationType
  rate: number
  inputQuantity: number // litres, amount, or pieces
  resultRupees: number
  resultPoints: number
  ruleName: string
  overridden?: boolean
  overrideReason?: string
}

export interface Transaction {
  id: string
  plumberId: string
  plumberCode: string
  plumberName: string
  billNumber?: string
  billAmount?: number
  points: number
  rupeeValue: number
  type: TransactionType
  lines?: TransactionLine[]
  calculationSummary?: string
  festivalMultiplierApplied?: number
  previousBalance: number
  newBalance: number
  remarks?: string
  adminId: string
  adminEmail: string
  createdAt: string
}

export interface PointRule {
  id: string
  name: string
  category: string
  brand: string // blank means 'any brand'
  calculationType: RuleCalculationType
  rate: number
  minPurchaseAmount?: number
  maxPointsPerLine?: number
  validFrom?: string
  validTo?: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  createdAt: string
}

export interface Brand {
  id: string
  name: string
  createdAt: string
}

export type RedemptionMethod = 'upi' | 'voucher' | 'tool'
export type RedemptionStatus = 'pending' | 'approved' | 'rejected' | 'paid' | 'dispatched'

export interface RedemptionRequest {
  id: string
  plumberId: string
  plumberCode: string
  plumberName: string
  plumberPhone: string
  points: number
  rupeeValue: number
  method: RedemptionMethod
  upiId?: string
  voucherDetails?: string
  toolDetails?: string
  status: RedemptionStatus
  upiReference?: string
  adminRemarks?: string
  createdAt: string
  updatedAt: string
}

export interface CatalogueItem {
  id: string
  name: string
  description: string
  pointsCost: number
  rupeeValue: number
  category: 'voucher' | 'tool'
  imageUrl?: string
  inStock: boolean
  createdAt: string
}

export interface Scheme {
  id: string
  title: string
  description: string
  bannerUrl: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
}

export interface GeneralSettings {
  appName: string
  shopName: string
  shopLocation: string
  supportPhone: string
  defaultEarnPercent: number
  rupeeValuePerPoint: number
  roundingMode: 'floor' | 'round' | 'ceil'
  minRedeemPoints: number
  welcomeBonus: number
  referralBonus: number
  pointsExpiryMonths: number
  weeklyTargetThreshold: number
  weeklyTargetPoints: number
  monthlyTargetThreshold: number
  monthlyTargetPoints: number
  festivalMultiplier: number
  festivalStartDate?: string
  festivalEndDate?: string
  leaderboardRewardText: string
  showEarningRatesToPlumbers: boolean
  showCalculationDetailsToPlumbers: boolean
}

export interface FeatureControls {
  welcomeBonus: boolean
  referral: boolean
  targetBonus: boolean
  expiry: boolean
  leaderboard: boolean
  festivalDoublePoints: boolean
  bannerSlider: boolean
  redemptionUpi: boolean
  redemptionVoucher: boolean
  redemptionTools: boolean
  qrScanning: boolean
  whatsappAuto: boolean
}

export interface WhatsAppSettings {
  enabled: boolean
  provider: string
  templatesApproved: boolean
  comingSoonMessage: string
}

export interface AuditLog {
  id: string
  adminId: string
  adminEmail: string
  action: string
  entity: string
  entityId: string
  oldValue: any
  newValue: any
  timestamp: string
}

export interface AdminUser {
  uid: string
  email: string
  displayName: string
  role: 'owner' | 'staff'
  createdAt: string
}
