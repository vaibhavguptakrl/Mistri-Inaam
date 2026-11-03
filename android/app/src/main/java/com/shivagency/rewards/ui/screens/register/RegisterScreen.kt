package com.shivagency.rewards.ui.screens.register

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import coil.compose.rememberAsyncImagePainter
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import com.shivagency.rewards.data.model.Plumber
import com.shivagency.rewards.data.repository.AuthRepository
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

@Composable
fun RegisterScreen(
    onRegistrationSuccess: (Plumber) -> Unit,
    isHindi: Boolean
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val authRepository = remember { AuthRepository(context) }

    var fullName by remember { mutableStateOf("") }
    var mobileNumber by remember { mutableStateOf("") }
    var emailAddress by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var selfieUri by remember { mutableStateOf<Uri?>(null) }
    var consentAgreed by remember { mutableStateOf(false) }
    var showCamera by remember { mutableStateOf(false) }
    var cameraPermissionError by remember { mutableStateOf<String?>(null) }
    var isValidatingPhoto by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }
    var progressText by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var photoMessage by remember { mutableStateOf<String?>(null) }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) {
            cameraPermissionError = null
            showCamera = true
        } else {
            cameraPermissionError = if (isHindi) "लाइव सेल्फी के लिए कैमरा अनुमति आवश्यक है।" else "Camera permission is required to take your live selfie."
        }
    }

    fun openFrontCamera() {
        cameraPermissionError = null
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            showCamera = true
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    fun submitRegistration() {
        val cleanPhone = mobileNumber.filter(Char::isDigit)
        when {
            fullName.trim().length < 2 -> errorMessage = if (isHindi) "कृपया अपना पूरा नाम दर्ज करें।" else "Enter your full name."
            cleanPhone.length != 10 -> errorMessage = if (isHindi) "कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।" else "Enter a valid 10-digit mobile number."
            !android.util.Patterns.EMAIL_ADDRESS.matcher(emailAddress.trim()).matches() -> errorMessage = if (isHindi) "कृपया सही ईमेल पता दर्ज करें।" else "Enter a valid email address."
            password.length < 8 || password.none(Char::isLetter) || password.none(Char::isDigit) -> errorMessage = if (isHindi) "पासवर्ड में कम से कम 8 अक्षर, एक अक्षर और एक अंक रखें।" else "Use at least 8 characters, including a letter and a number."
            password != confirmPassword -> errorMessage = if (isHindi) "दोनों पासवर्ड मेल नहीं खाते।" else "Passwords do not match."
            address.trim().length < 8 -> errorMessage = if (isHindi) "कृपया अपना पूरा पता दर्ज करें।" else "Enter your complete address."
            selfieUri == null -> errorMessage = if (isHindi) "कृपया फ्रंट कैमरे से अपनी लाइव सेल्फी लें।" else "Capture your live selfie with the front camera."
            !consentAgreed -> errorMessage = if (isHindi) "कृपया सत्यापन के लिए अपने विवरण और सेल्फी साझा करने की सहमति दें।" else "Please agree to share your details and selfie for membership review."
            else -> {
                isSubmitting = true
                errorMessage = null
                scope.launch {
                    try {
                        val applicant = authRepository.registerMemberAccount(cleanPhone, emailAddress.trim(), password)
                        progressText = if (isHindi) "आपकी सेल्फी सुरक्षित रूप से अपलोड हो रही है…" else "Uploading your selfie securely…"
                        val photoUrl = authRepository.uploadKYCDocument(
                            applicant.uid,
                            "registration_selfie_${System.currentTimeMillis()}.jpg",
                            selfieUri!!
                        )
                        progressText = if (isHindi) "सत्यापन अनुरोध भेजा जा रहा है…" else "Sending your application for review…"
                        val profile = authRepository.submitRegistrationRequest(
                            userId = applicant.uid,
                            name = fullName.trim(),
                            phone = cleanPhone,
                            email = emailAddress.trim(),
                            address = address.trim(),
                            selfieUrl = photoUrl,
                            language = if (isHindi) "hi" else "en"
                        )
                        onRegistrationSuccess(profile)
                    } catch (e: Exception) {
                        errorMessage = e.localizedMessage ?: if (isHindi) "पंजीकरण भेजा नहीं जा सका। कृपया इंटरनेट जाँचकर फिर प्रयास करें।" else "Could not submit your application. Check your connection and try again."
                    } finally {
                        isSubmitting = false
                    }
                }
            }
        }
    }

    Surface(modifier = Modifier.fillMaxSize(), color = Color(0xFFFAF9F6)) {
        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(48.dp).background(Color(0xFF775A00), RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Badge, contentDescription = null, tint = Color.White, modifier = Modifier.size(25.dp))
                }
                Column(Modifier.padding(start = 12.dp)) {
                    Text(if (isHindi) "शिव एजेंसी में शामिल हों" else "Join Shiv Agency Rewards", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1A1C1A))
                    Text(if (isHindi) "सदस्यता आवेदन • OTP की आवश्यकता नहीं" else "Membership application • No OTP required", fontSize = 11.sp, color = Color(0xFF775A00), fontWeight = FontWeight.SemiBold)
                }
            }

            Surface(color = Color(0xFFF2EDDF), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.Top) {
                    Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFF775A00), modifier = Modifier.size(18.dp))
                    Text(
                        if (isHindi) "सभी जानकारी और साफ सेल्फी जमा करने के बाद शिव एजेंसी आपका आवेदन जाँचेगी। मंजूरी मिलने तक खाता लंबित रहेगा।"
                        else "Shiv Agency will review your details and clear selfie after you submit. Your account stays pending until approved.",
                        fontSize = 11.sp, lineHeight = 16.sp, color = Color(0xFF4E4635), modifier = Modifier.padding(start = 8.dp)
                    )
                }
            }

            if (errorMessage != null) {
                Surface(color = Color(0xFFFFEDEA), shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(errorMessage!!, color = Color(0xFF93000A), fontSize = 12.sp, modifier = Modifier.padding(12.dp))
                }
            }
            if (cameraPermissionError != null) {
                Surface(color = Color(0xFFFFEDEA), shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(cameraPermissionError!!, color = Color(0xFF93000A), fontSize = 12.sp, modifier = Modifier.padding(12.dp))
                }
            }

            Card(shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = Color.White), elevation = CardDefaults.cardElevation(2.dp), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = fullName, onValueChange = { fullName = it },
                        label = { Text(if (isHindi) "पूरा नाम *" else "Full name *") },
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) }, singleLine = true,
                        shape = RoundedCornerShape(11.dp), modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = mobileNumber,
                        onValueChange = { value -> val digits = value.filter(Char::isDigit).take(10); mobileNumber = digits },
                        label = { Text(if (isHindi) "मोबाइल नंबर *" else "Mobile number *") },
                        leadingIcon = { Text("+91", color = Color(0xFF775A00), fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 12.dp)) },
                        singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        shape = RoundedCornerShape(11.dp), modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = emailAddress, onValueChange = { emailAddress = it.trimStart() },
                        label = { Text(if (isHindi) "ईमेल पता *" else "Email address *") },
                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                        singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        shape = RoundedCornerShape(11.dp), modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = password, onValueChange = { password = it },
                        label = { Text(if (isHindi) "पासवर्ड बनाएँ *" else "Create password *") },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                        singleLine = true, visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        supportingText = { Text(if (isHindi) "कम से कम 8 अक्षर, एक अक्षर और एक अंक" else "At least 8 characters, one letter and one number") },
                        shape = RoundedCornerShape(11.dp), modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = confirmPassword, onValueChange = { confirmPassword = it },
                        label = { Text(if (isHindi) "पासवर्ड की पुष्टि करें *" else "Confirm password *") },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                        singleLine = true, visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        shape = RoundedCornerShape(11.dp), modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = address, onValueChange = { address = it },
                        label = { Text(if (isHindi) "पूरा पता *" else "Full address *") },
                        leadingIcon = { Icon(Icons.Default.LocationOn, contentDescription = null) },
                        minLines = 3, maxLines = 4, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                        shape = RoundedCornerShape(11.dp), modifier = Modifier.fillMaxWidth()
                    )

                    HorizontalDivider(color = Color(0xFFE3E2E0))
                    Column {
                        Text(if (isHindi) "लाइव सेल्फी *" else "Live selfie *", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1A1C1A))
                        Text(if (isHindi) "फ्रंट कैमरा इस्तेमाल होगा। चेहरा साफ, सामने और फ्रेम में होना चाहिए।" else "The front camera is required. Keep your face clear, centered, and in frame.", fontSize = 10.sp, lineHeight = 15.sp, color = Color(0xFF807663), modifier = Modifier.padding(top = 3.dp, bottom = 7.dp))
                        SelfiePreviewCard(
                            uri = selfieUri,
                            isValidating = isValidatingPhoto,
                            photoMessage = photoMessage,
                            isHindi = isHindi,
                            onClick = { if (!isSubmitting && !isValidatingPhoto) openFrontCamera() }
                        )
                    }

                    Row(verticalAlignment = Alignment.Top) {
                        Checkbox(checked = consentAgreed, onCheckedChange = { consentAgreed = it })
                        Text(
                            if (isHindi) "मैं सदस्यता जाँच के लिए अपना नाम, मोबाइल, ईमेल, पता और सेल्फी शिव एजेंसी के साथ साझा करने की सहमति देता/देती हूँ।"
                            else "I agree to share my name, mobile, email, address, and selfie with Shiv Agency for membership review.",
                            fontSize = 10.sp, lineHeight = 15.sp, color = Color(0xFF4E4635), modifier = Modifier.padding(top = 10.dp)
                        )
                        Text(
                            if (isHindi) "गोपनीयता नीति पढ़ें" else "Read our Privacy Policy",
                            color = Color(0xFF006C4A),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(start = 12.dp, top = 3.dp).clickable {
                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://sa-mistri-inaam.web.app/privacy")))
                            }
                        )
                    }

                    Button(
                        onClick = { submitRegistration() },
                        enabled = !isSubmitting && !isValidatingPhoto,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFC59B27), contentColor = Color(0xFF473500)),
                        modifier = Modifier.fillMaxWidth().height(52.dp)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(Modifier.size(20.dp), color = Color(0xFF473500), strokeWidth = 2.dp)
                            Text(progressText, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 9.dp))
                        } else {
                            Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(18.dp))
                            Text(if (isHindi) "सत्यापन के लिए आवेदन भेजें" else "Submit for review", fontSize = 14.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 8.dp))
                        }
                    }
                }
            }
        }
    }

    if (showCamera) {
        SelfieCameraDialog(
            isHindi = isHindi,
            onDismiss = { showCamera = false },
            onPhotoCaptured = { uri ->
                showCamera = false
                isValidatingPhoto = true
                photoMessage = null
                scope.launch {
                    try {
                        val validationError = validateLiveSelfie(context, uri, isHindi)
                        if (validationError == null) {
                            selfieUri = uri
                            photoMessage = if (isHindi) "फोटो साफ है और समीक्षा के लिए तैयार है।" else "Photo looks clear and is ready for review."
                        } else {
                            selfieUri = null
                            photoMessage = validationError
                        }
                    } catch (e: Exception) {
                        selfieUri = null
                        photoMessage = if (isHindi) "फोटो जाँची नहीं जा सकी। कृपया फिर से फोटो लें।" else "Could not check the photo. Please capture it again."
                    } finally {
                        isValidatingPhoto = false
                    }
                }
            }
        )
    }
}

@Composable
private fun SelfiePreviewCard(
    uri: Uri?,
    isValidating: Boolean,
    photoMessage: String?,
    isHindi: Boolean,
    onClick: () -> Unit
) {
    Column {
        Box(
            modifier = Modifier.fillMaxWidth().height(154.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(Color(0xFFF4F3F1))
                .border(1.dp, if (uri != null) Color(0xFF006C4A) else Color(0xFFD1C5AF), RoundedCornerShape(14.dp))
                .clickable(onClick = onClick),
            contentAlignment = Alignment.Center
        ) {
            when {
                isValidating -> CircularProgressIndicator(color = Color(0xFF775A00), modifier = Modifier.size(28.dp))
                uri != null -> {
                    Image(painter = rememberAsyncImagePainter(uri), contentDescription = "Captured selfie", contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                    Box(Modifier.align(Alignment.BottomEnd).padding(8.dp).background(Color(0xCC006C4A), CircleShape).padding(8.dp)) {
                        Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                    }
                }
                else -> Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.CameraFront, contentDescription = null, tint = Color(0xFF775A00), modifier = Modifier.size(34.dp))
                    Text(if (isHindi) "फ्रंट कैमरा खोलने के लिए टैप करें" else "Tap to open front camera", color = Color(0xFF775A00), fontSize = 11.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 6.dp))
                }
            }
        }
        if (photoMessage != null) {
            Text(photoMessage, color = if (uri != null) Color(0xFF006C4A) else Color(0xFF93000A), fontSize = 10.sp, lineHeight = 14.sp, modifier = Modifier.padding(top = 5.dp))
        }
    }
}

private suspend fun validateLiveSelfie(context: android.content.Context, uri: Uri, isHindi: Boolean): String? {
    val options = FaceDetectorOptions.Builder()
        .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
        .build()
    val detector = FaceDetection.getClient(options)
    try {
        val input = InputImage.fromFilePath(context, uri)
        val faces = detector.process(input).await()
        if (faces.size != 1) {
            return if (isHindi) "फोटो में केवल एक चेहरा साफ दिखना चाहिए। कृपया फिर से लें।" else "Show only one clear face in the photo. Please retake it."
        }
        val bounds = faces.first().boundingBox
        val widthRatio = bounds.width().toFloat() / input.width
        val heightRatio = bounds.height().toFloat() / input.height
        val centerX = (bounds.centerX().toFloat() / input.width)
        val centerY = (bounds.centerY().toFloat() / input.height)
        if (widthRatio !in 0.18f..0.78f || heightRatio !in 0.18f..0.78f || centerX !in 0.22f..0.78f || centerY !in 0.20f..0.80f) {
            return if (isHindi) "चेहरा फ्रेम के बीच में रखें और कैमरे से सही दूरी बनाएँ।" else "Center your face in the frame and adjust your distance from the camera."
        }
    } finally {
        detector.close()
    }

    val file = java.io.File(uri.path ?: return if (isHindi) "फोटो पढ़ी नहीं जा सकी।" else "Could not read the photo.")
    val bitmap = android.graphics.BitmapFactory.decodeFile(file.absolutePath, android.graphics.BitmapFactory.Options().apply { inSampleSize = 8 })
        ?: return if (isHindi) "फोटो पढ़ी नहीं जा सकी।" else "Could not read the photo."
    val small = android.graphics.Bitmap.createScaledBitmap(bitmap, 128, 128, true)
    if (small !== bitmap) bitmap.recycle()

    var totalBrightness = 0.0
    val gray = DoubleArray(128 * 128)
    for (y in 0 until 128) for (x in 0 until 128) {
        val pixel = small.getPixel(x, y)
        val luminance = (0.299 * android.graphics.Color.red(pixel) + 0.587 * android.graphics.Color.green(pixel) + 0.114 * android.graphics.Color.blue(pixel))
        gray[y * 128 + x] = luminance
        totalBrightness += luminance
    }
    small.recycle()
    val brightness = totalBrightness / gray.size
    if (brightness < 38 || brightness > 225) {
        return if (isHindi) "फोटो बहुत अँधेरी या तेज़ है। रोशनी ठीक करके फिर लें।" else "The photo is too dark or bright. Adjust the lighting and retake it."
    }

    var laplacianSum = 0.0
    var laplacianSquareSum = 0.0
    var count = 0
    for (y in 1 until 127) for (x in 1 until 127) {
        val i = y * 128 + x
        val laplacian = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - 128] - gray[i + 128]
        laplacianSum += laplacian
        laplacianSquareSum += laplacian * laplacian
        count++
    }
    val sharpness = laplacianSquareSum / count - (laplacianSum / count) * (laplacianSum / count)
    if (sharpness < 11.0) {
        return if (isHindi) "फोटो धुँधली है। कैमरा स्थिर रखें और फिर से लें।" else "The photo looks blurry. Hold the camera steady and retake it."
    }
    return null
}
