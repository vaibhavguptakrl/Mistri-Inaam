package com.shivagency.rewards.data.repository

import android.content.Context
import android.net.Uri
import com.google.firebase.auth.AuthResult
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.functions.FirebaseFunctions
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.storage.FirebaseStorage
import com.shivagency.rewards.data.model.Plumber
import kotlinx.coroutines.tasks.await
import kotlin.random.Random

class AuthRepository(private val context: Context) {
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
    private val storage: FirebaseStorage = FirebaseStorage.getInstance()
    private val functions: FirebaseFunctions = FirebaseFunctions.getInstance("asia-south1")
    private val prefs = context.getSharedPreferences("shiv_rewards_prefs", Context.MODE_PRIVATE)

    fun getCurrentUserId(): String? = auth.currentUser?.uid

    fun isUserLoggedIn(): Boolean = auth.currentUser != null

    suspend fun signInWithGoogle(idToken: String): AuthResult {
        val credential = GoogleAuthProvider.getCredential(idToken, null)
        return auth.signInWithCredential(credential).await()
    }

    suspend fun registerMemberAccount(phone: String, email: String, password: String): FirebaseUser {
        val apiKey = auth.app.options.apiKey ?: throw IllegalStateException("Firebase API key is missing.")
        val result = functions.getHttpsCallable("registerMemberAccount").call(
            mapOf("phone" to phone, "email" to email, "password" to password, "apiKey" to apiKey)
        ).await()
        val token = (result.getData() as? Map<*, *>)?.get("customToken") as? String
            ?: throw IllegalStateException("Account setup could not be completed.")
        return auth.signInWithCustomToken(token).await().user
            ?: throw IllegalStateException("Account sign-in could not be completed.")
    }

    suspend fun signInWithPhonePassword(phone: String, password: String): FirebaseUser {
        val apiKey = auth.app.options.apiKey ?: throw IllegalStateException("Firebase API key is missing.")
        val result = functions.getHttpsCallable("signInMemberWithPhonePassword").call(
            mapOf("phone" to phone, "password" to password, "apiKey" to apiKey)
        ).await()
        val token = (result.getData() as? Map<*, *>)?.get("customToken") as? String
            ?: throw IllegalStateException("Sign-in could not be completed.")
        return auth.signInWithCustomToken(token).await().user
            ?: throw IllegalStateException("Sign-in could not be completed.")
    }

    suspend fun requestMemberPasswordReset(identifier: String) {
        functions.getHttpsCallable("requestMemberPasswordReset").call(mapOf("identifier" to identifier)).await()
    }

    // Check if phone number is already registered in Firestore
    suspend fun getPlumberProfile(uid: String): Plumber? {
        return try {
            val snapshot = firestore.collection("plumbers").document(uid).get().await()
            if (snapshot.exists()) {
                snapshot.toObject(Plumber::class.java)
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
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

    suspend fun submitRegistrationRequest(
        userId: String,
        name: String,
        phone: String,
        email: String,
        address: String,
        selfieUrl: String,
        language: String
    ): Plumber {
        val plumberCode = generatePlumberCode()
        val now = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).format(java.util.Date())
        val applicant = Plumber(
            id = userId,
            name = name,
            phone = "+91$phone",
            whatsappNumber = "+91$phone",
            email = email,
            address = address,
            selfieUrl = selfieUrl,
            referralCode = plumberCode,
            plumberCode = plumberCode,
            kycStatus = "pending",
            registrationStatus = "pending_review",
            registrationSource = "mobile_signup",
            pointsBalance = 0,
            lifetimeEarned = 0,
            totalRedeemed = 0,
            language = language,
            pinEnabled = false,
            whatsappOptIn = false,
            createdAt = now,
            updatedAt = now
        )
        firestore.collection("plumbers").document(userId).set(applicant).await()
        return applicant
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

    // Color Theme Management
    fun getSavedTheme(): String = prefs.getString("selected_theme", "BLUE") ?: "BLUE"

    fun setSavedTheme(themeName: String) {
        prefs.edit().putString("selected_theme", themeName).apply()
    }

    fun signOut() {
        auth.signOut()
    }
}
