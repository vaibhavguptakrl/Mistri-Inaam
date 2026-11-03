package com.shivagency.rewards

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.fragment.app.FragmentActivity
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.google.firebase.firestore.FirebaseFirestore
import com.shivagency.rewards.data.model.Plumber
import com.shivagency.rewards.data.repository.AuthRepository
import com.shivagency.rewards.ui.components.EliteBottomBar
import com.shivagency.rewards.ui.components.EliteTab
import com.shivagency.rewards.ui.screens.home.HomeScreen
import com.shivagency.rewards.ui.screens.howyouearn.HowYouEarnScreen
import com.shivagency.rewards.ui.screens.leaderboard.LeaderboardScreen
import com.shivagency.rewards.ui.screens.login.LoginScreen
import com.shivagency.rewards.ui.screens.maintenance.MaintenanceScreen
import com.shivagency.rewards.ui.screens.pin.PinLockScreen
import com.shivagency.rewards.ui.screens.refer.ReferScreen
import com.shivagency.rewards.ui.screens.register.RegisterScreen
import com.shivagency.rewards.ui.screens.register.PendingReviewScreen
import com.shivagency.rewards.ui.screens.redeem.RedeemScreen
import com.shivagency.rewards.ui.screens.settings.SettingsScreen
import com.shivagency.rewards.ui.screens.statement.StatementScreen
import com.shivagency.rewards.ui.theme.ShivAgencyTheme
import kotlinx.coroutines.launch

enum class ScreenState {
    LOGIN,
    REGISTER,
    PENDING_REVIEW,
    PIN_LOCK,
    HOME,
    STATEMENT,
    HOW_YOU_EARN,
    REDEEM,
    REFER,
    LEADERBOARD,
    SETTINGS
}

class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        setContent {
            val context = LocalContext.current
            val scope = rememberCoroutineScope()
            val authRepo = remember { AuthRepository(context) }

            var isHindi by remember { mutableStateOf(authRepo.getSavedLanguage() == "hi") }
            var currentScreen by remember { mutableStateOf(ScreenState.LOGIN) }
            var currentPlumber by remember { mutableStateOf<Plumber?>(null) }
            var pendingPhoneNumber by remember { mutableStateOf("") }
            var pendingUserId by remember { mutableStateOf("") }
            var isSettingUpPin by remember { mutableStateOf(false) }
            var maintenanceEnabled by remember { mutableStateOf(false) }
            var maintenanceNotice by remember { mutableStateOf("") }

            BackHandler(enabled = currentScreen !in setOf(ScreenState.LOGIN, ScreenState.HOME)) {
                currentScreen = when (currentScreen) {
                    ScreenState.REGISTER, ScreenState.PENDING_REVIEW -> ScreenState.LOGIN
                    ScreenState.PIN_LOCK -> if (isSettingUpPin) ScreenState.SETTINGS else ScreenState.HOME
                    else -> ScreenState.HOME
                }
            }

            DisposableEffect(Unit) {
                val registration = FirebaseFirestore.getInstance()
                    .collection("appSettings")
                    .document("maintenance")
                    .addSnapshotListener { snapshot, error ->
                        if (error != null) {
                            android.util.Log.w("ShivAgency", "Could not read maintenance mode", error)
                        } else if (snapshot != null) {
                            maintenanceEnabled = snapshot.getBoolean("enabled") == true
                            maintenanceNotice = snapshot.getString("message").orEmpty()
                        }
                    }
                onDispose { registration.remove() }
            }

            // Check existing login on startup
            LaunchedEffect(Unit) {
                try {
                    val uid = authRepo.getCurrentUserId()
                    if (uid != null) {
                        val profile = authRepo.getPlumberProfile(uid)
                        if (profile != null) {
                            currentPlumber = profile
                            val savedPin = authRepo.getSavedPin()
                            if (profile.registrationSource == "mobile_signup" && profile.kycStatus != "approved") {
                                currentScreen = ScreenState.PENDING_REVIEW
                            } else if (authRepo.isPinEnabled() && !savedPin.isNullOrBlank()) {
                                currentScreen = ScreenState.PIN_LOCK
                            } else {
                                // A stale enabled flag without a saved PIN would lock the user out.
                                if (authRepo.isPinEnabled()) authRepo.setPinEnabled(false)
                                currentScreen = ScreenState.HOME
                            }
                        } else {
                            pendingUserId = uid
                            currentScreen = ScreenState.REGISTER
                        }
                    } else {
                        currentScreen = ScreenState.LOGIN
                    }
                } catch (e: Exception) {
                    currentScreen = ScreenState.LOGIN
                }
            }

            ShivAgencyTheme {
                Surface(
                    modifier = Modifier
                        .fillMaxSize()
                        .safeDrawingPadding(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    Column(modifier = Modifier.fillMaxSize()) {
                        Box(modifier = Modifier.weight(1f)) {
                    if (maintenanceEnabled) {
                        MaintenanceScreen(isHindi = isHindi, notice = maintenanceNotice)
                    } else when (currentScreen) {
                        ScreenState.LOGIN -> {
                            LoginScreen(
                                onRegisterClick = {
                                    pendingPhoneNumber = ""
                                    pendingUserId = ""
                                    currentScreen = ScreenState.REGISTER
                                },
                                isHindi = isHindi,
                                onToggleLanguage = {
                                    isHindi = !isHindi
                                    authRepo.setSavedLanguage(if (isHindi) "hi" else "en")
                                },
                                onLoginSuccess = { isNewUser, phone ->
                                    val uid = authRepo.getCurrentUserId() ?: ""
                                    pendingPhoneNumber = phone
                                    pendingUserId = uid
                                    if (isNewUser) {
                                        currentScreen = ScreenState.REGISTER
                                    } else {
                                        scope.launch {
                                            val profile = authRepo.getPlumberProfile(uid)
                                            if (profile != null) {
                                                currentPlumber = profile
                                                val savedPin = authRepo.getSavedPin()
                                                if (profile.registrationSource == "mobile_signup" && profile.kycStatus != "approved") {
                                                    currentScreen = ScreenState.PENDING_REVIEW
                                                } else if (authRepo.isPinEnabled() && !savedPin.isNullOrBlank()) {
                                                    currentScreen = ScreenState.PIN_LOCK
                                                } else {
                                                    if (authRepo.isPinEnabled()) authRepo.setPinEnabled(false)
                                                    currentScreen = ScreenState.HOME
                                                }
                                            } else {
                                                currentScreen = ScreenState.REGISTER
                                            }
                                        }
                                    }
                                }
                            )
                        }

                        ScreenState.REGISTER -> {
                            RegisterScreen(
                                isHindi = isHindi,
                                onRegistrationSuccess = { plumber ->
                                    currentPlumber = plumber
                                    currentScreen = ScreenState.PENDING_REVIEW
                                }
                            )
                        }

                        ScreenState.PENDING_REVIEW -> {
                            PendingReviewScreen(
                                plumber = currentPlumber,
                                isHindi = isHindi,
                                onCheckStatus = {
                                    scope.launch {
                                        val uid = authRepo.getCurrentUserId()
                                        if (uid != null) {
                                            val refreshed = authRepo.getPlumberProfile(uid)
                                            if (refreshed != null) {
                                                currentPlumber = refreshed
                                                if (refreshed.kycStatus == "approved") currentScreen = ScreenState.HOME
                                            }
                                        }
                                    }
                                }
                            )
                        }

                        ScreenState.PIN_LOCK -> {
                            PinLockScreen(
                                isSettingUp = isSettingUpPin,
                                isHindi = isHindi,
                                onPinSuccess = {
                                    currentScreen = if (isSettingUpPin) ScreenState.SETTINGS else ScreenState.HOME
                                    isSettingUpPin = false
                                }
                            )
                        }

                        ScreenState.HOME -> {
                            if (currentPlumber != null) {
                                HomeScreen(
                                    plumber = currentPlumber!!,
                                    isHindi = isHindi,
                                    onToggleLanguage = {
                                        isHindi = !isHindi
                                        authRepo.setSavedLanguage(if (isHindi) "hi" else "en")
                                    },
                                    onNavigateToStatement = {
                                        currentScreen = ScreenState.STATEMENT
                                    },
                                    onNavigateToRedeem = {
                                        currentScreen = ScreenState.REDEEM
                                    },
                                    onNavigateToRefer = {
                                        currentScreen = ScreenState.REFER
                                    },
                                    onNavigateToLeaderboard = {
                                        currentScreen = ScreenState.LEADERBOARD
                                    },
                                    onNavigateToHowYouEarn = {
                                        currentScreen = ScreenState.HOW_YOU_EARN
                                    },
                                    onNavigateToSettings = {
                                        currentScreen = ScreenState.SETTINGS
                                    }
                                )
                            }
                        }

                        ScreenState.REDEEM -> {
                            if (currentPlumber != null) {
                                RedeemScreen(
                                    plumber = currentPlumber!!,
                                    isHindi = isHindi,
                                    onBack = {
                                        // Refresh plumber balance when returning to home
                                        scope.launch {
                                            val updated = authRepo.getPlumberProfile(currentPlumber!!.id)
                                            if (updated != null) {
                                                currentPlumber = updated
                                            }
                                        }
                                        currentScreen = ScreenState.HOME
                                    }
                                )
                            }
                        }

                        ScreenState.REFER -> {
                            if (currentPlumber != null) {
                                ReferScreen(
                                    plumber = currentPlumber!!,
                                    isHindi = isHindi,
                                    onBack = { currentScreen = ScreenState.HOME }
                                )
                            }
                        }

                        ScreenState.LEADERBOARD -> {
                            if (currentPlumber != null) {
                                LeaderboardScreen(
                                    currentPlumber = currentPlumber!!,
                                    isHindi = isHindi,
                                    onBack = { currentScreen = ScreenState.HOME }
                                )
                            }
                        }

                        ScreenState.SETTINGS -> {
                            if (currentPlumber != null) {
                                SettingsScreen(
                                    plumber = currentPlumber!!,
                                    isHindi = isHindi,
                                    onLanguageChange = { newLangIsHindi ->
                                        isHindi = newLangIsHindi
                                        authRepo.setSavedLanguage(if (isHindi) "hi" else "en")
                                    },
                                    onBack = { currentScreen = ScreenState.HOME },
                                    onEnablePinLock = {
                                        isSettingUpPin = true
                                        currentScreen = ScreenState.PIN_LOCK
                                    },
                                    onSignOut = {
                                        authRepo.signOut()
                                        currentPlumber = null
                                        currentScreen = ScreenState.LOGIN
                                    }
                                )
                            }
                        }

                        ScreenState.STATEMENT -> {
                            StatementScreen(
                                plumberId = currentPlumber?.id ?: "",
                                isHindi = isHindi,
                                currentBalance = currentPlumber?.pointsBalance ?: 0L,
                                onBack = { currentScreen = ScreenState.HOME }
                            )
                        }

                        ScreenState.HOW_YOU_EARN -> {
                            HowYouEarnScreen(
                                isHindi = isHindi,
                                onBack = { currentScreen = ScreenState.HOME }
                            )
                        }
                    }
                        }

                        if (!maintenanceEnabled && currentPlumber != null && currentScreen in setOf(ScreenState.HOME, ScreenState.STATEMENT, ScreenState.REDEEM, ScreenState.SETTINGS)) {
                            val selectedTab = when (currentScreen) {
                                ScreenState.STATEMENT -> EliteTab.PASSBOOK
                                ScreenState.REDEEM -> EliteTab.REWARDS
                                ScreenState.SETTINGS -> EliteTab.PROFILE
                                else -> EliteTab.HOME
                            }
                            EliteBottomBar(selected = selectedTab, isHindi = isHindi) { tab ->
                                currentScreen = when (tab) {
                                    EliteTab.HOME -> ScreenState.HOME
                                    EliteTab.PASSBOOK -> ScreenState.STATEMENT
                                    EliteTab.REWARDS -> ScreenState.REDEEM
                                    EliteTab.PROFILE -> ScreenState.SETTINGS
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
