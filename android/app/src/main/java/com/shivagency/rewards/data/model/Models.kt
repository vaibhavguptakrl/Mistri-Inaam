package com.shivagency.rewards.data.model

import com.google.firebase.firestore.PropertyName

data class Plumber(
    val id: String = "",
    val name: String = "",
    val phone: String = "",
    val whatsappNumber: String = "",
    val email: String = "",
    val panNumber: String = "",
    val panCardUrl: String = "",
    val aadhaarLast4: String = "",
    val aadhaarCardUrl: String = "",
    val selfieUrl: String = "",
    val referralCode: String = "",
    val referredBy: String? = null,
    val plumberCode: String = "",
    val kycStatus: String = "pending", // "pending", "approved", "rejected"
    val kycRemarks: String? = null,
    val pointsBalance: Long = 0,
    val lifetimeEarned: Long = 0,
    val totalRedeemed: Long = 0,
    val language: String = "en", // "hi" or "en"
    val pinEnabled: Boolean = false,
    val pinHash: String? = null,
    val fcmToken: String? = null,
    val whatsappOptIn: Boolean = false,
    val createdAt: String = "",
    val updatedAt: String = ""
)

data class TransactionLine(
    val category: String = "",
    val brand: String = "",
    val calculationType: String = "", // "PER_LITRE", "PERCENT_OF_AMOUNT", etc.
    val rate: Double = 0.0,
    val inputQuantity: Double = 0.0,
    val resultRupees: Double = 0.0,
    val resultPoints: Long = 0,
    val ruleName: String = "",
    val overridden: Boolean = false,
    val overrideReason: String? = null
)

data class Transaction(
    val id: String = "",
    val plumberId: String = "",
    val plumberCode: String = "",
    val plumberName: String = "",
    val billNumber: String? = null,
    val billAmount: Double? = null,
    val points: Long = 0,
    val rupeeValue: Double = 0.0,
    val type: String = "purchase", // "purchase", "welcome_bonus", "referral", "target_bonus", etc.
    val lines: List<TransactionLine> = emptyList(),
    val calculationSummary: String? = null,
    val festivalMultiplierApplied: Double? = null,
    val previousBalance: Long = 0,
    val newBalance: Long = 0,
    val remarks: String? = null,
    val adminId: String = "",
    val adminEmail: String = "",
    val createdAt: String = ""
)

data class RedemptionRequest(
    val id: String = "",
    val plumberId: String = "",
    val plumberCode: String = "",
    val plumberName: String = "",
    val plumberPhone: String = "",
    val points: Long = 0,
    val rupeeValue: Double = 0.0,
    val method: String = "upi", // "upi", "voucher", "tool"
    val upiId: String? = null,
    val voucherDetails: String? = null,
    val toolDetails: String? = null,
    val status: String = "pending", // "pending", "approved", "rejected", "paid", "dispatched"
    val upiReference: String? = null,
    val adminRemarks: String? = null,
    val createdAt: String = "",
    val updatedAt: String = ""
)

data class Scheme(
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val bannerUrl: String = "",
    val startDate: String = "",
    val endDate: String = "",
    val isActive: Boolean = true,
    val createdAt: String = ""
)

data class GeneralSettings(
    val appName: String = "Shiv Agency Loyalty Rewards",
    val shopName: String = "Shiv Agency",
    val shopLocation: String = "Karauli, Rajasthan",
    val supportPhone: String = "",
    val defaultEarnPercent: Double = 1.0,
    val rupeeValuePerPoint: Double = 1.0,
    val roundingMode: String = "floor",
    val minRedeemPoints: Long = 3000,
    val welcomeBonus: Long = 500,
    val referralBonus: Long = 50,
    val pointsExpiryMonths: Long = 6,
    val leaderboardRewardText: String = "",
    val showEarningRatesToPlumbers: Boolean = true,
    val showCalculationDetailsToPlumbers: Boolean = true
)

data class FeatureControls(
    val welcomeBonus: Boolean = true,
    val referral: Boolean = true,
    val targetBonus: Boolean = true,
    val expiry: Boolean = true,
    val leaderboard: Boolean = true,
    val festivalDoublePoints: Boolean = false,
    val bannerSlider: Boolean = true,
    val redemptionUpi: Boolean = true,
    val redemptionVoucher: Boolean = true,
    val redemptionTools: Boolean = true,
    val qrScanning: Boolean = false,
    val whatsappAuto: Boolean = false
)

data class PointRule(
    val id: String = "",
    val name: String = "",
    val category: String = "",
    val brand: String = "",
    val calculationType: String = "", // "PERCENT_OF_AMOUNT", "PER_LITRE", "FIXED_POINTS", etc.
    val rate: Double = 0.0,
    val sortOrder: Int = 0,
    val isActive: Boolean = true,
    val createdAt: String = ""
)

data class CatalogueItem(
    val id: String = "",
    val name: String = "",
    val description: String = "",
    val pointsCost: Long = 0,
    val rupeeValue: Double = 0.0,
    val category: String = "tool", // "tool" or "voucher"
    val imageUrl: String? = null,
    val inStock: Boolean = true,
    val createdAt: String = ""
)

