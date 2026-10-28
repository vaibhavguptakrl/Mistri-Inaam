package com.shivagency.rewards.data.repository

import android.content.Context
import android.net.Uri
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthProvider
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.storage.FirebaseStorage
import com.shivagency.rewards.data.model.Plumber
import kotlinx.coroutines.tasks.await
import java.util.UUID
import kotlin.random.Random

class AuthRepository(private val context: Context) {
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
    private val storage: FirebaseStorage = FirebaseStorage.getInstance()
    private val prefs = context.getSharedPreferences("shiv_rewards_prefs", Context.MODE_PRIVATE)

    fun getCurrentUserId(): String? = prefs.getString("demo_user_id", null) ?: auth.currentUser?.uid

    fun isUserLoggedIn(): Boolean = prefs.getString("demo_user_id", null) != null || auth.currentUser != null

    // Check if phone number is already registered in Firestore
    suspend fun getPlumberProfile(uid: String): Plumber? {
        val snapshot = firestore.collection("plumbers").document(uid).get().await()
        return if (snapshot.exists()) {
            snapshot.toObject(Plumber::class.java)
        } else {
            null
        }
    }

    // Instant Demo Plumber Login for effortless testing without SMS/SHA-1 setup
    suspend fun signInDemoPlumber(): Plumber {
        val demoUid = "demo_plumber_99999"
        prefs.edit().putString("demo_user_id", demoUid).apply()

        val existing = getPlumberProfile(demoUid)
        if (existing != null) {
            return existing
        }

        val now = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).format(java.util.Date())
        val demoPlumber = Plumber(
            id = demoUid,
            name = "Ramesh Kumar (Plumber)",
            phone = "+919999999999",
            whatsappNumber = "+919999999999",
            email = "ramesh.plumber@shivagency.com",
            panNumber = "ABCDE1234F",
            panCardUrl = "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=400&q=80",
            aadhaarLast4 = "4821",
            aadhaarCardUrl = "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=400&q=80",
            selfieUrl = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
            referralCode = "SA-4821",
            plumberCode = "SA-4821",
            kycStatus = "pending",
            pointsBalance = 650,
            lifetimeEarned = 650,
            totalRedeemed = 0,
            language = "hi",
            pinEnabled = false,
            whatsappOptIn = false,
            createdAt = now,
            updatedAt = now
        )

        firestore.collection("plumbers").document(demoUid).set(demoPlumber).await()
        return demoPlumber
    }

    // Upload an image file (Aadhaar, PAN, or Selfie) to Firebase Storage
    suspend fun uploadKYCDocument(userId: String, fileName: String, uri: Uri): String {
        val ref = storage.reference.child("kyc/$userId/$fileName")
        val uploadTask = ref.putFile(uri).await()
        return ref.downloadUrl.await().toString()
    }

    // Generate unique plumber code: e.g. SA-4821
    fun generatePlumberCode(): String {
        val randomNum = Random.nextInt(1000, 9999)
        return "SA-$randomNum"
    }

    // Complete Registration & KYC
    suspend fun registerPlumber(
        userId: String,
        name: String,
        phone: String,
        whatsapp: String,
        email: String,
        panNumber: String,
        panUrl: String,
        aadhaarLast4: String,
        aadhaarUrl: String,
        selfieUrl: String,
        referralCode: String?,
        language: String
    ): Plumber {
        val plumberCode = generatePlumberCode()
        val now = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).format(java.util.Date())

        // Check Welcome Bonus Feature
        var welcomeBonusPoints = 0L
        try {
            val featuresDoc = firestore.collection("appSettings").document("features").get().await()
            val isWelcomeEnabled = featuresDoc.getBoolean("welcomeBonus") ?: true
            if (isWelcomeEnabled) {
                val generalDoc = firestore.collection("appSettings").document("general").get().await()
                welcomeBonusPoints = generalDoc.getLong("welcomeBonus") ?: 500L
            }
        } catch (e: Exception) {
            welcomeBonusPoints = 500L
        }

        val plumber = Plumber(
            id = userId,
            name = name,
            phone = phone,
            whatsappNumber = whatsapp,
            email = email,
            panNumber = panNumber,
            panCardUrl = panUrl,
            aadhaarLast4 = aadhaarLast4,
            aadhaarCardUrl = aadhaarUrl,
            selfieUrl = selfieUrl,
            referralCode = plumberCode,
            referredBy = if (!referralCode.isNullOrBlank()) referralCode.trim() else null,
            plumberCode = plumberCode,
            kycStatus = "pending",
            pointsBalance = welcomeBonusPoints,
            lifetimeEarned = welcomeBonusPoints,
            totalRedeemed = 0,
            language = language,
            pinEnabled = false,
            whatsappOptIn = false,
            createdAt = now,
            updatedAt = now
        )

        firestore.collection("plumbers").document(userId).set(plumber).await()

        if (welcomeBonusPoints > 0) {
            try {
                val txId = java.util.UUID.randomUUID().toString()
                val tx = hashMapOf(
                    "id" to txId,
                    "plumberId" to userId,
                    "plumberCode" to plumberCode,
                    "plumberName" to name,
                    "points" to welcomeBonusPoints,
                    "rupeeValue" to welcomeBonusPoints.toDouble(),
                    "type" to "welcome_bonus",
                    "calculationSummary" to "Shiv Agency Welcome Bonus on Registration",
                    "previousBalance" to 0L,
                    "newBalance" to welcomeBonusPoints,
                    "createdAt" to now
                )
                firestore.collection("transactions").document(txId).set(tx).await()
            } catch (ignored: Exception) {
                // Non-fatal if transaction ledger write has security rules restrictions
            }
        }
        return plumber
    }

    // Language Preference Management
    fun getSavedLanguage(): String = prefs.getString("selected_lang", "hi") ?: "hi"

    fun setSavedLanguage(lang: String) {
        prefs.edit().putString("selected_lang", lang).apply()
    }

    // PIN Lock Management
    fun isPinEnabled(): Boolean = prefs.getBoolean("pin_enabled", false)

    fun setPinEnabled(enabled: Boolean) {
        prefs.edit().putBoolean("pin_enabled", enabled).apply()
    }

    fun getSavedPin(): String? = prefs.getString("app_pin", null)

    fun savePin(pin: String) {
        prefs.edit().putString("app_pin", pin).putBoolean("pin_enabled", true).apply()
    }

    fun signOut() {
        prefs.edit().remove("demo_user_id").apply()
        auth.signOut()
    }
}
