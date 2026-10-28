package com.shivagency.rewards.ui.screens.register

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.rememberAsyncImagePainter
import com.shivagency.rewards.R
import com.shivagency.rewards.data.model.Plumber
import com.shivagency.rewards.data.repository.AuthRepository
import kotlinx.coroutines.launch

@Composable
fun RegisterScreen(
    phoneNumber: String,
    userId: String,
    onRegistrationSuccess: (Plumber) -> Unit,
    isHindi: Boolean
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val authRepository = remember { AuthRepository(context) }

    var fullName by remember { mutableStateOf("") }
    var whatsappNumber by remember { mutableStateOf(phoneNumber.removePrefix("+91")) }
    var emailAddress by remember { mutableStateOf("") }
    var panNumber by remember { mutableStateOf("") }
    var aadhaarLast4 by remember { mutableStateOf("") }
    var referralCode by remember { mutableStateOf("") }
    var consentAgreed by remember { mutableStateOf(false) }

    var panImageUri by remember { mutableStateOf<Uri?>(null) }
    var aadhaarImageUri by remember { mutableStateOf<Uri?>(null) }
    var selfieImageUri by remember { mutableStateOf<Uri?>(null) }

    var isSubmitting by remember { mutableStateOf(false) }
    var uploadStatusMessage by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    // Photo Pickers
    val panPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) panImageUri = uri
    }
    val aadhaarPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) aadhaarImageUri = uri
    }
    val selfiePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) selfieImageUri = uri
    }

    val submitRegistration = {
        when {
            fullName.trim().isBlank() -> {
                errorMessage = if (isHindi) "कृपया अपना पूरा नाम दर्ज करें" else "Please enter your full name"
            }
            whatsappNumber.trim().length != 10 -> {
                errorMessage = if (isHindi) "कृपया 10 अंकों का व्हाट्सएप नंबर दर्ज करें" else "Please enter a valid 10-digit WhatsApp number"
            }
            emailAddress.trim().isBlank() || !emailAddress.contains("@") -> {
                errorMessage = if (isHindi) "कृपया सही ईमेल पता दर्ज करें" else "Please enter a valid email address"
            }
            panNumber.trim().length != 10 -> {
                errorMessage = if (isHindi) "कृपया 10 अंकों का पैन कार्ड नंबर दर्ज करें" else "Please enter a valid 10-character PAN number"
            }
            panImageUri == null -> {
                errorMessage = if (isHindi) "कृपया पैन कार्ड की फोटो अपलोड करें" else "Please upload your PAN card photo"
            }
            aadhaarLast4.trim().length != 4 -> {
                errorMessage = if (isHindi) "कृपया आधार कार्ड के अंतिम 4 अंक दर्ज करें" else "Please enter the last 4 digits of Aadhaar"
            }
            aadhaarImageUri == null -> {
                errorMessage = if (isHindi) "कृपया आधार कार्ड की फोटो अपलोड करें" else "Please upload your Aadhaar card photo"
            }
            selfieImageUri == null -> {
                errorMessage = if (isHindi) "कृपया अपनी सेल्फी फोटो लें" else "Please capture/upload your live selfie"
            }
            !consentAgreed -> {
                errorMessage = if (isHindi) "कृपया नियमों और शर्तों पर सहमति दें" else "Please accept the terms and conditions"
            }
            else -> {
                isSubmitting = true
                errorMessage = null
                scope.launch {
                    try {
                        uploadStatusMessage = if (isHindi) "पैन कार्ड फोटो अपलोड हो रही है..." else "Uploading PAN card..."
                        val panUrl = authRepository.uploadKYCDocument(userId, "pan_${System.currentTimeMillis()}.jpg", panImageUri!!)

                        uploadStatusMessage = if (isHindi) "आधार कार्ड फोटो अपलोड हो रही है..." else "Uploading Aadhaar card..."
                        val aadhaarUrl = authRepository.uploadKYCDocument(userId, "aadhaar_${System.currentTimeMillis()}.jpg", aadhaarImageUri!!)

                        uploadStatusMessage = if (isHindi) "सेल्फी फोटो अपलोड हो रही है..." else "Uploading selfie..."
                        val selfieUrl = authRepository.uploadKYCDocument(userId, "selfie_${System.currentTimeMillis()}.jpg", selfieImageUri!!)

                        uploadStatusMessage = if (isHindi) "ठेकेदार खाता तैयार किया जा रहा है..." else "Creating contractor profile..."
                        val plumber = authRepository.registerPlumber(
                            userId = userId,
                            name = fullName.trim(),
                            phone = phoneNumber,
                            whatsapp = "+91" + whatsappNumber.trim(),
                            email = emailAddress.trim(),
                            panNumber = panNumber.trim().uppercase(),
                            panUrl = panUrl,
                            aadhaarLast4 = aadhaarLast4.trim(),
                            aadhaarUrl = aadhaarUrl,
                            selfieUrl = selfieUrl,
                            referralCode = referralCode.trim(),
                            language = if (isHindi) "hi" else "en"
                        )

                        onRegistrationSuccess(plumber)
                    } catch (e: Exception) {
                        errorMessage = e.localizedMessage ?: "Registration failed. Please check internet connection."
                    } finally {
                        isSubmitting = false
                    }
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
                .verticalScroll(rememberScrollState())
                .padding(20.dp)
        ) {
            // Header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(bottom = 16.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .background(MaterialTheme.colorScheme.primary, shape = RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Badge,
                        contentDescription = "KYC",
                        tint = Color.White
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = if (isHindi) "ठेकेदार केवाईसी पंजीकरण" else "Contractor Registration",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = if (isHindi) "शिव एजेंसी से रिवॉर्ड्स पाने हेतु विवरण भरें" else "Shiv Agency Loyalty KYC Details",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }

            if (errorMessage != null) {
                Surface(
                    color = MaterialTheme.colorScheme.errorContainer,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp)
                ) {
                    Text(
                        text = errorMessage!!,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(10.dp)
                    )
                }
            }

            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // 1. Full Name
                    OutlinedTextField(
                        value = fullName,
                        onValueChange = { fullName = it },
                        label = { Text(if (isHindi) "पूरा नाम *" else "Full Name *") },
                        placeholder = { Text("e.g. Ramesh Kumar") },
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    // 2. Mobile (Disabled prefilled)
                    OutlinedTextField(
                        value = phoneNumber,
                        onValueChange = {},
                        enabled = false,
                        label = { Text(if (isHindi) "मोबाइल नंबर (सत्यापित)" else "Verified Mobile Number") },
                        leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null) },
                        trailingIcon = { Icon(Icons.Default.CheckCircle, contentDescription = "Verified", tint = Color(0xFF10B981)) },
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    // 3. WhatsApp Number
                    OutlinedTextField(
                        value = whatsappNumber,
                        onValueChange = { if (it.length <= 10 && it.all { c -> c.isDigit() }) whatsappNumber = it },
                        label = { Text(if (isHindi) "व्हाट्सएप नंबर *" else "WhatsApp Number *") },
                        leadingIcon = { Text("+91 ", fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 12.dp)) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    // 4. Email Address
                    OutlinedTextField(
                        value = emailAddress,
                        onValueChange = { emailAddress = it },
                        label = { Text(if (isHindi) "ईमेल पता *" else "Email Address *") },
                        placeholder = { Text("ramesh@gmail.com") },
                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Divider
                    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

                    Text(
                        text = if (isHindi) "केवाईसी दस्तावेज (KYC Documents)" else "KYC Documents",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.primary
                    )

                    // 5. PAN Card Number & Photo
                    OutlinedTextField(
                        value = panNumber,
                        onValueChange = { if (it.length <= 10) panNumber = it.uppercase() },
                        label = { Text(if (isHindi) "पैन कार्ड नंबर *" else "PAN Number *") },
                        placeholder = { Text("ABCDE1234F") },
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    UploadBox(
                        title = if (isHindi) "पैन कार्ड फोटो *" else "PAN Card Photo *",
                        uri = panImageUri,
                        onClick = { panPicker.launch("image/*") },
                        isHindi = isHindi
                    )

                    // 6. Aadhaar Last 4 Digits & Photo
                    OutlinedTextField(
                        value = aadhaarLast4,
                        onValueChange = { if (it.length <= 4 && it.all { c -> c.isDigit() }) aadhaarLast4 = it },
                        label = { Text(if (isHindi) "आधार कार्ड अंतिम 4 अंक *" else "Aadhaar Card Last 4 Digits *") },
                        placeholder = { Text("4321") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    UploadBox(
                        title = if (isHindi) "आधार कार्ड फोटो *" else "Aadhaar Card Photo *",
                        uri = aadhaarImageUri,
                        onClick = { aadhaarPicker.launch("image/*") },
                        isHindi = isHindi
                    )

                    // 7. Live Selfie
                    UploadBox(
                        title = if (isHindi) "लाइव सेल्फी फोटो *" else "Live Selfie Capture *",
                        uri = selfieImageUri,
                        onClick = { selfiePicker.launch("image/*") },
                        isHindi = isHindi,
                        isCamera = true
                    )

                    // 8. Referral Code (Optional)
                    OutlinedTextField(
                        value = referralCode,
                        onValueChange = { referralCode = it.uppercase() },
                        label = { Text(if (isHindi) "रेफरल कोड (वैकल्पिक)" else "Referral Code (Optional)") },
                        placeholder = { Text("SA-1234") },
                        leadingIcon = { Icon(Icons.Default.CardGiftcard, contentDescription = null) },
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    // 9. Consent Checkbox
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(vertical = 4.dp)
                    ) {
                        Checkbox(
                            checked = consentAgreed,
                            onCheckedChange = { consentAgreed = it }
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (isHindi)
                                "मैं शिव एजेंसी की रिवॉर्ड्स नीति और गोपनीयता शर्तों से सहमत हूँ।"
                            else
                                "I agree to Shiv Agency loyalty terms and privacy policy.",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                        )
                    }

                    // Submit Button
                    Button(
                        onClick = { submitRegistration() },
                        enabled = !isSubmitting,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                    ) {
                        if (isSubmitting) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = uploadStatusMessage,
                                    fontSize = 13.sp,
                                    color = Color.White
                                )
                            }
                        } else {
                            Text(
                                text = if (isHindi) "केवाईसी पंजीकरण पूर्ण करें" else "Submit Registration & KYC",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun UploadBox(
    title: String,
    uri: Uri?,
    onClick: () -> Unit,
    isHindi: Boolean,
    isCamera: Boolean = false
) {
    Column {
        Text(
            text = title,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(100.dp)
                .clip(RoundedCornerShape(10.dp))
                .border(
                    width = 1.dp,
                    color = if (uri != null) Color(0xFF10B981) else MaterialTheme.colorScheme.outline.copy(alpha = 0.4f),
                    shape = RoundedCornerShape(10.dp)
                )
                .background(
                    if (uri != null) Color(0xFF10B981).copy(alpha = 0.05f)
                    else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                )
                .clickable { onClick() },
            contentAlignment = Alignment.Center
        ) {
            if (uri != null) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Image(
                        painter = rememberAsyncImagePainter(uri),
                        contentDescription = "Uploaded Document",
                        modifier = Modifier
                            .size(70.dp)
                            .clip(RoundedCornerShape(8.dp)),
                        contentScale = ContentScale.Crop
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (isHindi) "फोटो चुनी गई" else "Photo Selected",
                                color = Color(0xFF10B981),
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }
                        Text(
                            text = if (isHindi) "बदलने के लिए टैप करें" else "Tap to change",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }
            } else {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = if (isCamera) Icons.Default.CameraAlt else Icons.Default.CloudUpload,
                        contentDescription = "Upload",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = if (isCamera)
                            (if (isHindi) "सेल्फी लेने हेतु टैप करें" else "Tap to capture selfie")
                        else
                            (if (isHindi) "फोटो अपलोड करने हेतु टैप करें" else "Tap to select photo"),
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}
