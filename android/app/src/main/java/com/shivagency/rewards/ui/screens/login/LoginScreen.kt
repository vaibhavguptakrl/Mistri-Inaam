package com.shivagency.rewards.ui.screens.login

import android.app.Activity
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.FirebaseException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import com.shivagency.rewards.R
import com.shivagency.rewards.data.repository.AuthRepository
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.util.concurrent.TimeUnit

@Composable
fun LoginScreen(
    onLoginSuccess: (isNewUser: Boolean, phoneNumber: String) -> Unit,
    onDemoLoginClick: () -> Unit,
    isHindi: Boolean,
    onToggleLanguage: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val authRepository = remember { AuthRepository(context) }
    val auth = remember { FirebaseAuth.getInstance() }

    var phoneNumber by remember { mutableStateOf("") }
    var otpCode by remember { mutableStateOf("") }
    var verificationId by remember { mutableStateOf<String?>(null) }
    var isOtpSent by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var countdown by remember { mutableStateOf(60) }

    // Resend countdown timer
    LaunchedEffect(isOtpSent) {
        if (isOtpSent) {
            countdown = 60
            while (countdown > 0) {
                kotlinx.coroutines.delay(1000)
                countdown--
            }
        }
    }

    val sendOtp = {
        if (phoneNumber.trim().length != 10) {
            errorMessage = if (isHindi) "कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें" else "Please enter a valid 10-digit mobile number"
        } else {
            isLoading = true
            errorMessage = null
            val fullNumber = "+91" + phoneNumber.trim()

            val options = PhoneAuthOptions.newBuilder(auth)
                .setPhoneNumber(fullNumber)
                .setTimeout(60L, TimeUnit.SECONDS)
                .setActivity(context as Activity)
                .setCallbacks(object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
                    override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                        scope.launch {
                            try {
                                val result = auth.signInWithCredential(credential).await()
                                val uid = result.user?.uid
                                if (uid != null) {
                                    val profile = authRepository.getPlumberProfile(uid)
                                    onLoginSuccess(profile == null, fullNumber)
                                }
                            } catch (e: Exception) {
                                errorMessage = e.localizedMessage
                            } finally {
                                isLoading = false
                            }
                        }
                    }

                    override fun onVerificationFailed(e: FirebaseException) {
                        isLoading = false
                        errorMessage = e.localizedMessage ?: "OTP verification failed. Check Firebase SHA-1 / test numbers."
                    }

                    override fun onCodeSent(id: String, token: PhoneAuthProvider.ForceResendingToken) {
                        isLoading = false
                        verificationId = id
                        isOtpSent = true
                    }
                })
                .build()

            PhoneAuthProvider.verifyPhoneNumber(options)
        }
    }

    val verifyOtp = {
        if (otpCode.trim().length != 6) {
            errorMessage = if (isHindi) "कृपया 6 अंकों का ओटीपी दर्ज करें" else "Please enter the 6-digit OTP"
        } else if (verificationId != null) {
            isLoading = true
            errorMessage = null
            val credential = PhoneAuthProvider.getCredential(verificationId!!, otpCode.trim())
            scope.launch {
                try {
                    val result = auth.signInWithCredential(credential).await()
                    val uid = result.user?.uid
                    if (uid != null) {
                        val profile = authRepository.getPlumberProfile(uid)
                        val fullNumber = "+91" + phoneNumber.trim()
                        onLoginSuccess(profile == null, fullNumber)
                    }
                } catch (e: Exception) {
                    errorMessage = if (isHindi) "गलत ओटीपी। कृपया पुनः प्रयास करें।" else "Invalid OTP. Please try again."
                } finally {
                    isLoading = false
                }
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
            // Top Bar with Language Toggle
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = stringResource(id = R.string.shop_title),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )

                OutlinedButton(
                    onClick = onToggleLanguage,
                    shape = RoundedCornerShape(20.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Translate,
                        contentDescription = "Language",
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (isHindi) "English" else "हिंदी",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // Main Login Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Badge icon
                    Box(
                        modifier = Modifier
                            .size(60.dp)
                            .background(
                                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                shape = RoundedCornerShape(16.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (!isOtpSent) Icons.Default.Phone else Icons.Default.Lock,
                            contentDescription = "Login",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(30.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = if (!isOtpSent)
                            (if (isHindi) "प्लंबर एवं ठेकेदार लॉगिन" else "Plumber & Contractor Login")
                        else
                            (if (isHindi) "ओटीपी सत्यापन" else "Verify OTP"),
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                        textAlign = TextAlign.Center
                    )

                    Text(
                        text = if (!isOtpSent)
                            (if (isHindi) "रिवॉर्ड पॉइंट्स एवं स्टेटमेंट देखने के लिए अपना नंबर दर्ज करें" else "Enter your mobile number to view reward points & balance")
                        else
                            (if (isHindi) "+91 $phoneNumber पर भेजा गया 6 अंकों का ओटीपी दर्ज करें" else "Enter the 6-digit code sent to +91 $phoneNumber"),
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 4.dp, bottom = 18.dp)
                    )

                    if (errorMessage != null) {
                        Surface(
                            color = MaterialTheme.colorScheme.errorContainer,
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 14.dp)
                        ) {
                            Text(
                                text = errorMessage!!,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(10.dp),
                                textAlign = TextAlign.Center
                            )
                        }
                    }

                    if (!isOtpSent) {
                        // Phone number input
                        OutlinedTextField(
                            value = phoneNumber,
                            onValueChange = { if (it.length <= 10 && it.all { char -> char.isDigit() }) phoneNumber = it },
                            label = { Text(if (isHindi) "मोबाइल नंबर" else "Mobile Number") },
                            placeholder = { Text("9876543210") },
                            leadingIcon = {
                                Text(
                                    text = "+91  ",
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                                    modifier = Modifier.padding(start = 12.dp)
                                )
                            },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Button(
                            onClick = { sendOtp() },
                            enabled = !isLoading && phoneNumber.length == 10,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(24.dp),
                                    color = Color.White,
                                    strokeWidth = 2.5.dp
                                )
                            } else {
                                Text(
                                    text = if (isHindi) "ओटीपी प्राप्त करें" else "Get OTP",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        // Divider OR
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(vertical = 12.dp)
                        ) {
                            HorizontalDivider(modifier = Modifier.weight(1f))
                            Text(
                                text = if (isHindi) " या " else " OR ",
                                fontSize = 11.sp,
                                color = Color.Gray,
                                modifier = Modifier.padding(horizontal = 8.dp)
                            )
                            HorizontalDivider(modifier = Modifier.weight(1f))
                        }

                        // Instant Demo Login Button
                        OutlinedButton(
                            onClick = onDemoLoginClick,
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFD97706)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                        ) {
                            Icon(Icons.Default.FlashOn, contentDescription = null, tint = Color(0xFFD97706), modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = if (isHindi) "त्वरित डेमो लॉगिन (बिना एसएमएस के)" else "Instant Demo Login (Bypass SMS)",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }
                    } else {
                        // OTP Input
                        OutlinedTextField(
                            value = otpCode,
                            onValueChange = { if (it.length <= 6 && it.all { char -> char.isDigit() }) otpCode = it },
                            label = { Text(if (isHindi) "6 अंकों का ओटीपी" else "6-Digit OTP") },
                            placeholder = { Text("123456") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Button(
                            onClick = { verifyOtp() },
                            enabled = !isLoading && otpCode.length == 6,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(24.dp),
                                    color = Color.White,
                                    strokeWidth = 2.5.dp
                                )
                            } else {
                                Text(
                                    text = if (isHindi) "सत्यापित करें एवं जारी रखें" else "Verify & Continue",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TextButton(onClick = { isOtpSent = false; otpCode = "" }) {
                                Text(
                                    text = if (isHindi) "नंबर बदलें" else "Change Number",
                                    fontSize = 12.sp
                                )
                            }

                            TextButton(
                                onClick = { sendOtp() },
                                enabled = countdown == 0 && !isLoading
                            ) {
                                Text(
                                    text = if (countdown > 0)
                                        (if (isHindi) "पुनः भेजें ($countdown s)" else "Resend ($countdown s)")
                                    else
                                        (if (isHindi) "ओटीपी पुनः भेजें" else "Resend OTP"),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }
            }

            // Explanatory Help Card
            Surface(
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = if (isHindi) "💡 डेमो नंबर टेस्ट करने के लिए:" else "💡 To Test with Demo Number:",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = if (isHindi)
                            "1. फायरबेस कंसोल में Authentication ➔ Sign-in method ➔ Phone ➔ 'Phone numbers for testing' में +91 9999999999 (OTP: 123456) जोड़ें।\n2. या सीधे ऊपर 'त्वरित डेमो लॉगिन' दबाएं।"
                        else
                            "1. Add +91 9999999999 (OTP: 123456) in Firebase Console ➔ Authentication ➔ Sign-in method ➔ Phone ➔ 'Phone numbers for testing'.\n2. Or tap 'Instant Demo Login' above.",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                        lineHeight = 16.sp
                    )
                }
            }
        }
    }
}
