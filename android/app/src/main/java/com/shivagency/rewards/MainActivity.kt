package com.shivagency.rewards

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.shivagency.rewards.data.model.Plumber
import com.shivagency.rewards.data.repository.AuthRepository
import com.shivagency.rewards.ui.screens.home.HomeScreen
import com.shivagency.rewards.ui.screens.howyouearn.HowYouEarnScreen
import com.shivagency.rewards.ui.screens.leaderboard.LeaderboardScreen
import com.shivagency.rewards.ui.screens.login.LoginScreen
import com.shivagency.rewards.ui.screens.pin.PinLockScreen
import com.shivagency.rewards.ui.screens.refer.ReferScreen
import com.shivagency.rewards.ui.screens.register.RegisterScreen
import com.shivagency.rewards.ui.screens.redeem.RedeemScreen
import com.shivagency.rewards.ui.screens.settings.SettingsScreen
import com.shivagency.rewards.ui.screens.statement.StatementScreen
import com.shivagency.rewards.ui.theme.AppColorTheme
import com.shivagency.rewards.ui.theme.ShivAgencyTheme
import kotlinx.coroutines.launch

enum class ScreenState {
    LOGIN,
    REGISTER,
    PIN_LOCK,
    HOME,
    STATEMENT,
    HOW_YOU_EARN,
    REDEEM,
    REFER,
    LEADERBOARD,
    SETTINGS
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            val context = LocalContext.current
            val scope = rememberCoroutineScope()
            val authRepo = remember { AuthRepository(context) }

            val savedThemeName = authRepo.getSavedTheme()
            var currentTheme by remember {
                mutableStateOf(try { AppColorTheme.valueOf(savedThemeName) } catch (e: Exception) { AppColorTheme.BLUE })
            }
            var isHindi by remember { mutableStateOf(authRepo.getSavedLanguage() == "hi") }
            var currentScreen by remember { mutableStateOf(ScreenState.LOGIN) }
            var currentPlumber by remember { mutableStateOf<Plumber?>(null) }
            var pendingPhoneNumber by remember { mutableStateOf("") }
            var pendingUserId by remember { mutableStateOf("") }

            // Check existing login on startup
            LaunchedEffect(Unit) {
                try {
                    val uid = authRepo.getCurrentUserId()
                    if (uid != null) {
                        val profile = authRepo.getPlumberProfile(uid)
                        if (profile != null) {
                            currentPlumber = profile
                            if (authRepo.isPinEnabled()) {
                                currentScreen = ScreenState.PIN_LOCK
                            } else {
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

            ShivAgencyTheme(colorTheme = currentTheme) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    when (currentScreen) {
                        ScreenState.LOGIN -> {
                            LoginScreen(
                                isHindi = isHindi,
                                onToggleLanguage = {
                                    isHindi = !isHindi
                                    authRepo.setSavedLanguage(if (isHindi) "hi" else "en")
                                },
                                onDemoLoginClick = {
                                    scope.launch {
                                        val demoPlumber = authRepo.signInDemoPlumber()
                                        currentPlumber = demoPlumber
                                        currentScreen = ScreenState.HOME
                                    }
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
                                                if (authRepo.isPinEnabled()) {
                                                    currentScreen = ScreenState.PIN_LOCK
                                                } else {
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
                                phoneNumber = pendingPhoneNumber,
                                userId = pendingUserId,
                                isHindi = isHindi,
                                onRegistrationSuccess = { plumber ->
                                    currentPlumber = plumber
                                    Toast.makeText(
                                        context,
                                        if (isHindi) "पंजीकरण सफल! आपका कोड: ${plumber.plumberCode}" else "Registration Complete! Your Code: ${plumber.plumberCode}",
                                        Toast.LENGTH_LONG
                                    ).show()
                                    currentScreen = ScreenState.HOME
                                }
                            )
                        }

                        ScreenState.PIN_LOCK -> {
                            PinLockScreen(
                                isSettingUp = false,
                                isHindi = isHindi,
                                onPinSuccess = {
                                    currentScreen = ScreenState.HOME
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
                                    },
                                    onSignOut = {
                                        authRepo.signOut()
                                        currentPlumber = null
                                        currentScreen = ScreenState.LOGIN
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
                                    currentTheme = currentTheme,
                                    onThemeChange = {
                                        currentTheme = it
                                        authRepo.setSavedTheme(it.name)
                                    },
                                    isHindi = isHindi,
                                    onLanguageChange = { newLangIsHindi ->
                                        isHindi = newLangIsHindi
                                        authRepo.setSavedLanguage(if (isHindi) "hi" else "en")
                                    },
                                    onBack = { currentScreen = ScreenState.HOME }
                                )
                            }
                        }

                        ScreenState.STATEMENT -> {
                            StatementScreen(
                                plumberId = currentPlumber?.id ?: "",
                                isHindi = isHindi,
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
            }
        }
    }
}
