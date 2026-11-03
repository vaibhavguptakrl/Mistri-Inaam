package com.shivagency.rewards.ui.screens.pin

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Backspace
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shivagency.rewards.data.repository.AuthRepository
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity

@Composable
fun PinLockScreen(
    isSettingUp: Boolean = false,
    onPinSuccess: () -> Unit,
    isHindi: Boolean
) {
    val context = LocalContext.current
    val activity = context as? FragmentActivity
    val authRepo = remember { AuthRepository(context) }
    val biometricManager = remember(context) { BiometricManager.from(context) }
    val biometricStatus = remember(context) {
        biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK)
    }
    val biometricPromptInfo = remember(isHindi) {
        BiometricPrompt.PromptInfo.Builder()
            .setTitle(if (isHindi) "शिव एजेंसी अनलॉक करें" else "Unlock Shiv Agency Rewards")
            .setSubtitle(if (isHindi) "फिंगरप्रिंट या बायोमेट्रिक से जारी रखें" else "Continue with fingerprint or device biometric")
            .setNegativeButtonText(if (isHindi) "पिन इस्तेमाल करें" else "Use PIN")
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK)
            .build()
    }
    var enteredPin by remember { mutableStateOf("") }
    var confirmPin by remember { mutableStateOf("") }
    var step by remember { mutableStateOf(if (isSettingUp) 1 else 0) } // 0: verify, 1: enter new, 2: confirm new
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val biometricPrompt = remember(activity) {
        activity?.let { host ->
            BiometricPrompt(
                host,
                ContextCompat.getMainExecutor(host),
                object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                        errorMessage = null
                        onPinSuccess()
                    }

                    override fun onAuthenticationFailed() {
                        errorMessage = if (isHindi) "फिंगरप्रिंट पहचान नहीं हुआ। फिर कोशिश करें या पिन डालें।" else "Fingerprint not recognized. Try again or enter your PIN."
                    }

                    override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                        if (errorCode != BiometricPrompt.ERROR_NEGATIVE_BUTTON) {
                            errorMessage = errString.toString()
                        }
                    }
                }
            )
        }
    }

    val handleDigit = { digit: String ->
        if (enteredPin.length < 4) {
            val newPin = enteredPin + digit
            enteredPin = newPin
            errorMessage = null

            if (newPin.length == 4) {
                if (!isSettingUp) {
                    // Verifying existing PIN
                    val saved = authRepo.getSavedPin()
                    if (saved == newPin) {
                        onPinSuccess()
                    } else {
                        errorMessage = if (isHindi) "गलत पिन। पुनः प्रयास करें।" else "Incorrect PIN. Try again."
                        enteredPin = ""
                    }
                } else if (step == 1) {
                    confirmPin = newPin
                    enteredPin = ""
                    step = 2
                } else if (step == 2) {
                    if (newPin == confirmPin) {
                        authRepo.savePin(newPin)
                        onPinSuccess()
                    } else {
                        errorMessage = if (isHindi) "पिन मेल नहीं खाया। पुनः प्रयास करें।" else "PINs do not match. Try again."
                        enteredPin = ""
                        step = 1
                    }
                }
            }
        }
    }

    val handleDelete = {
        if (enteredPin.isNotEmpty()) {
            enteredPin = enteredPin.dropLast(1)
            errorMessage = null
        }
    }

    val authenticateWithBiometric = {
        when (biometricStatus) {
            BiometricManager.BIOMETRIC_SUCCESS -> {
                if (isSettingUp) {
                    errorMessage = if (isHindi) "पहले अपना पिन बनाकर पुष्टि करें।" else "Create and confirm your PIN first."
                } else if (biometricPrompt != null) {
                    biometricPrompt.authenticate(biometricPromptInfo)
                } else {
                    errorMessage = if (isHindi) "बायोमेट्रिक लॉगिन इस डिवाइस पर उपलब्ध नहीं है।" else "Biometric sign-in is unavailable on this device."
                }
            }
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> {
                errorMessage = if (isHindi) "फिंगरप्रिंट इस्तेमाल करने के लिए पहले फ़ोन की सेटिंग्स में फिंगरप्रिंट जोड़ें।" else "Add a fingerprint in your phone settings to use fingerprint unlock."
            }
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE,
            BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED -> {
                errorMessage = if (isHindi) "इस डिवाइस पर फिंगरप्रिंट सुविधा उपलब्ध नहीं है। अपना पिन डालें।" else "Fingerprint unlock is not available on this device. Enter your PIN."
            }
            else -> {
                errorMessage = if (isHindi) "बायोमेट्रिक सुविधा अभी उपलब्ध नहीं है। अपना पिन डालें।" else "Biometric unlock is unavailable right now. Enter your PIN."
            }
        }
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Spacer(modifier = Modifier.height(20.dp))

            // Icon & Title
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f), shape = CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = "PIN Lock",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(32.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = when {
                        !isSettingUp -> if (isHindi) "ऐप सुरक्षा पिन दर्ज करें" else "Enter Security PIN"
                        step == 1 -> if (isHindi) "नया 4 अंकों का पिन बनाएं" else "Create 4-Digit PIN"
                        else -> if (isHindi) "पिन की पुष्टि करें" else "Confirm Your PIN"
                    },
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )

                Text(
                    text = if (isHindi) "शिव एजेंसी खाता सुरक्षा हेतु" else "To securely access your Shiv Agency points",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    modifier = Modifier.padding(top = 4.dp)
                )

                Spacer(modifier = Modifier.height(24.dp))

                // PIN Dots
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    for (i in 0 until 4) {
                        val isFilled = i < enteredPin.length
                        Box(
                            modifier = Modifier
                                .size(18.dp)
                                .clip(CircleShape)
                                .background(
                                    if (isFilled) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                                )
                        )
                    }
                }

                if (errorMessage != null) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = errorMessage!!,
                        color = MaterialTheme.colorScheme.error,
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center
                    )
                }
            }

            // Keypad
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                val keypadRows = listOf(
                    listOf("1", "2", "3"),
                    listOf("4", "5", "6"),
                    listOf("7", "8", "9"),
                    listOf("fingerprint", "0", "delete")
                )

                for (row in keypadRows) {
                    Row(
                        modifier = Modifier.fillMaxWidth(0.85f),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        for (key in row) {
                            when (key) {
                                "delete" -> {
                                    Box(
                                        modifier = Modifier
                                            .size(68.dp)
                                            .clip(CircleShape)
                                            .clickable { handleDelete() },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(Icons.Default.Backspace, contentDescription = "Delete", tint = MaterialTheme.colorScheme.onSurface)
                                    }
                                }
                                "fingerprint" -> {
                                    Box(
                                        modifier = Modifier
                                            .size(68.dp)
                                            .clip(CircleShape)
                                            .clickable { authenticateWithBiometric() },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            Icons.Default.Fingerprint,
                                            contentDescription = if (isHindi) "फिंगरप्रिंट से अनलॉक करें" else "Unlock with fingerprint",
                                            tint = if (biometricStatus == BiometricManager.BIOMETRIC_SUCCESS && !isSettingUp) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.45f)
                                        )
                                    }
                                }
                                else -> {
                                    Box(
                                        modifier = Modifier
                                            .size(68.dp)
                                            .clip(CircleShape)
                                            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                                            .clickable { handleDigit(key) },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = key,
                                            fontSize = 24.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = MaterialTheme.colorScheme.onSurface
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
