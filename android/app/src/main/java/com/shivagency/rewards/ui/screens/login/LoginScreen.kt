package com.shivagency.rewards.ui.screens.login

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.platform.LocalContext
import com.shivagency.rewards.R
import com.shivagency.rewards.data.repository.AuthRepository
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    onLoginSuccess: (isNewUser: Boolean, phoneNumber: String) -> Unit,
    onRegisterClick: () -> Unit,
    isHindi: Boolean,
    onToggleLanguage: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val repository = remember { AuthRepository(context) }
    var phone by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var visible by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var resetOpen by remember { mutableStateOf(false) }
    var resetIdentifier by remember { mutableStateOf("") }
    var resetMessage by remember { mutableStateOf<String?>(null) }
    var resetLoading by remember { mutableStateOf(false) }

    Surface(Modifier.fillMaxSize(), color = Color(0xFFFAF9F6)) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp, vertical = 14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = onToggleLanguage) { Text(if (isHindi) "English" else "हिंदी", color = Color(0xFF775A00)) }
            }
            Spacer(Modifier.height(8.dp))
            Image(painterResource(R.drawable.shiv_agency_logo), "Shiv Agency Karauli", Modifier.size(100.dp))
            Text("SHIV AGENCY ELITE", fontSize = 23.sp, fontWeight = FontWeight.Bold, color = Color(0xFF142B4F), modifier = Modifier.padding(top = 12.dp))
            Text(if (isHindi) "रिवॉर्ड्स क्लब • करौली" else "REWARDS CLUB • KARAULI", color = Color(0xFF775A00), fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
            Spacer(Modifier.height(24.dp))
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(13.dp)) {
                    Text(if (isHindi) "अपने खाते में लॉगिन करें" else "Sign in to your account", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1A1C1A))
                    Text(if (isHindi) "पंजीकृत मोबाइल और पासवर्ड दर्ज करें" else "Enter your registered mobile number and password", fontSize = 12.sp, color = Color(0xFF6B6254))
                    OutlinedTextField(phone, { value -> phone = value.filter(Char::isDigit).take(10); error = null }, label = { Text(if (isHindi) "मोबाइल नंबर" else "Mobile number") }, leadingIcon = { Text("+91") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(password, { password = it; error = null }, label = { Text(if (isHindi) "पासवर्ड" else "Password") }, leadingIcon = { Icon(Icons.Default.Lock, null) }, trailingIcon = { IconButton(onClick = { visible = !visible }) { Icon(if (visible) Icons.Default.VisibilityOff else Icons.Default.Visibility, if (visible) "Hide password" else "Show password") } }, visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(), singleLine = true, modifier = Modifier.fillMaxWidth())
                    TextButton(onClick = { resetIdentifier = phone; resetMessage = null; resetOpen = true }, modifier = Modifier.align(Alignment.End)) { Text(if (isHindi) "पासवर्ड भूल गए?" else "Forgot password?", color = Color(0xFF775A00)) }
                    if (error != null) Text(error!!, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                    Button(onClick = {
                        if (phone.length != 10 || password.isBlank()) { error = if (isHindi) "मोबाइल नंबर और पासवर्ड दर्ज करें।" else "Enter your 10-digit mobile number and password." }
                        else {
                            loading = true; error = null
                            scope.launch {
                                try { repository.signInWithPhonePassword(phone, password); onLoginSuccess(false, "+91$phone") }
                                catch (_: Exception) { error = if (isHindi) "मोबाइल नंबर या पासवर्ड सही नहीं है।" else "Mobile number or password is incorrect." }
                                finally { loading = false }
                            }
                        }
                    }, enabled = !loading, modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFC59B27), contentColor = Color(0xFF473500))) {
                        if (loading) CircularProgressIndicator(Modifier.size(22.dp), color = Color(0xFF473500), strokeWidth = 2.dp) else Text(if (isHindi) "लॉगिन करें" else "Login", fontWeight = FontWeight.Bold)
                    }
                    HorizontalDivider()
                    TextButton(onClick = onRegisterClick, modifier = Modifier.fillMaxWidth()) { Text(if (isHindi) "नए सदस्य? खाता बनाएँ" else "New user? Create an account", color = Color(0xFF142B4F), fontWeight = FontWeight.Bold) }
                }
            }
            Text(if (isHindi) "खाता स्वीकृत होने के बाद ही डैशबोर्ड खुलेगा।" else "Dashboard access is available after admin approval.", textAlign = TextAlign.Center, color = Color(0xFF6B6254), fontSize = 11.sp, modifier = Modifier.padding(top = 18.dp))
            Text("07464-220000 • Karauli, Rajasthan", color = Color(0xFF775A00), fontSize = 11.sp, modifier = Modifier.padding(top = 18.dp, bottom = 18.dp))
        }
    }

    if (resetOpen) Dialog(onDismissRequest = { resetOpen = false }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Card(Modifier.fillMaxWidth().padding(24.dp), shape = RoundedCornerShape(18.dp)) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(if (isHindi) "पासवर्ड रीसेट" else "Reset password", fontSize = 19.sp, fontWeight = FontWeight.Bold)
                Text(if (isHindi) "पंजीकृत मोबाइल नंबर या ईमेल दर्ज करें।" else "Enter the mobile number or email registered to your account.", fontSize = 13.sp)
                OutlinedTextField(resetIdentifier, { resetIdentifier = it }, label = { Text(if (isHindi) "मोबाइल या ईमेल" else "Mobile or email") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                resetMessage?.let { Text(it, color = Color(0xFF006C4A), fontSize = 12.sp) }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = { resetOpen = false }) { Text(if (isHindi) "बंद करें" else "Close") }
                    Button(enabled = !resetLoading, onClick = {
                        resetLoading = true
                        scope.launch {
                            try { repository.requestMemberPasswordReset(resetIdentifier.trim()); resetMessage = if (isHindi) "यदि खाता मेल खाता है, तो पंजीकृत ईमेल पर निर्देश भेजे जाएँगे।" else "If the account matches, reset instructions will be sent to its registered email." }
                            catch (_: Exception) { resetMessage = if (isHindi) "यदि खाता मेल खाता है, तो निर्देश भेजे जाएँगे।" else "If the account matches, reset instructions will be sent." }
                            finally { resetLoading = false }
                        }
                    }) { Text(if (isHindi) "लिंक भेजें" else "Send link") }
                }
            }
        }
    }
}
