package com.shivagency.rewards.ui.screens.register

import android.net.Uri
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import java.io.File
import java.util.concurrent.Executors
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import kotlinx.coroutines.delay

@Composable
fun SelfieCameraDialog(
    isHindi: Boolean,
    onDismiss: () -> Unit,
    onPhotoCaptured: (Uri) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val cameraProviderFuture = remember(context) { ProcessCameraProvider.getInstance(context) }
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }
    var imageCapture by remember { mutableStateOf<ImageCapture?>(null) }
    var cameraError by remember { mutableStateOf<String?>(null) }
    var isTakingPhoto by remember { mutableStateOf(false) }
    var faceReady by remember { mutableStateOf(false) }
    var faceMessage by remember { mutableStateOf(if (isHindi) "चेहरे का इंतज़ार है…" else "Looking for your face…") }
    val latestIsHindi by rememberUpdatedState(isHindi)
    val faceDetector = remember {
        FaceDetection.getClient(
            FaceDetectorOptions.Builder()
                .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
                .build()
        )
    }

    fun captureSelfie() {
        val capture = imageCapture ?: return
        if (isTakingPhoto) return
        isTakingPhoto = true
        faceReady = false
        cameraError = null
        val output = File(context.cacheDir, "registration_selfie_${System.currentTimeMillis()}.jpg")
        val options = ImageCapture.OutputFileOptions.Builder(output).build()
        capture.takePicture(options, cameraExecutor, object : ImageCapture.OnImageSavedCallback {
            override fun onImageSaved(result: ImageCapture.OutputFileResults) {
                ContextCompat.getMainExecutor(context).execute {
                    isTakingPhoto = false
                    onPhotoCaptured(Uri.fromFile(output))
                }
            }

            override fun onError(exception: ImageCaptureException) {
                ContextCompat.getMainExecutor(context).execute {
                    isTakingPhoto = false
                    cameraError = if (isHindi) "फोटो नहीं ली जा सकी। फिर प्रयास करें।" else "Could not capture the photo. Please try again."
                }
            }
        })
    }

    LaunchedEffect(faceReady) {
        if (faceReady) {
            delay(900)
            if (faceReady && !isTakingPhoto) captureSelfie()
        }
    }

    DisposableEffect(cameraExecutor) {
        onDispose {
            cameraExecutor.shutdown()
            faceDetector.close()
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)
    ) {
        Column(Modifier.fillMaxSize().background(Color.Black)) {
            Row(
                Modifier.fillMaxWidth().background(Color(0xDD151515)).padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = if (isHindi) "बंद करें" else "Close", tint = Color.White)
                }
                Text(if (isHindi) "लाइव सेल्फी" else "Live selfie", color = Color.White, fontSize = 17.sp, modifier = Modifier.weight(1f))
            }

            Box(Modifier.weight(1f).fillMaxWidth()) {
                AndroidView(
                    factory = { viewContext ->
                        val previewView = PreviewView(viewContext).apply {
                            scaleType = PreviewView.ScaleType.FILL_CENTER
                            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
                        }
                        cameraProviderFuture.addListener({
                            try {
                                val provider = cameraProviderFuture.get()
                                val preview = Preview.Builder().build().also { it.surfaceProvider = previewView.surfaceProvider }
                                val capture = ImageCapture.Builder()
                                    .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                                    .setJpegQuality(95)
                                    .setTargetRotation(previewView.display.rotation)
                                    .build()
                                val analysis = ImageAnalysis.Builder()
                                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                                    .build()
                                var consecutiveGoodFrames = 0
                                analysis.setAnalyzer(cameraExecutor) { proxy ->
                                    val mediaImage = proxy.image
                                    if (mediaImage == null) {
                                        proxy.close()
                                    } else {
                                        val image = InputImage.fromMediaImage(mediaImage, proxy.imageInfo.rotationDegrees)
                                        faceDetector.process(image)
                                            .addOnSuccessListener { faces ->
                                                val face = faces.singleOrNull()
                                                val centered = face?.boundingBox?.let { bounds ->
                                                    val centerX = bounds.centerX().toFloat() / proxy.width.coerceAtLeast(1)
                                                    val centerY = bounds.centerY().toFloat() / proxy.height.coerceAtLeast(1)
                                                    val sizeRatio = bounds.width().toFloat() / proxy.width.coerceAtLeast(1)
                                                    centerX in 0.30f..0.70f && centerY in 0.20f..0.80f && sizeRatio in 0.18f..0.82f
                                                } == true
                                                if (centered) {
                                                    consecutiveGoodFrames++
                                                    if (consecutiveGoodFrames >= 3 && !isTakingPhoto) {
                                                        faceReady = true
                                                        faceMessage = if (latestIsHindi) "चेहरा सही है — फोटो ली जा रही है" else "Face ready — capturing selfie"
                                                    } else {
                                                        faceMessage = if (latestIsHindi) "चेहरा स्थिर रखें…" else "Hold still…"
                                                    }
                                                } else {
                                                    consecutiveGoodFrames = 0
                                                    faceReady = false
                                                    faceMessage = when {
                                                        faces.size > 1 -> if (latestIsHindi) "फ्रेम में केवल एक व्यक्ति रखें" else "Only one person should be in frame"
                                                        face == null -> if (latestIsHindi) "चेहरे का इंतज़ार है…" else "Looking for your face…"
                                                        else -> if (latestIsHindi) "चेहरे को अंडाकार फ्रेम के बीच रखें" else "Center your face in the oval"
                                                    }
                                                }
                                            }
                                            .addOnFailureListener {
                                                consecutiveGoodFrames = 0
                                                faceReady = false
                                                faceMessage = if (latestIsHindi) "चेहरा पहचान नहीं सका — रोशनी बढ़ाएँ" else "Face not clear — improve the lighting"
                                            }
                                            .addOnCompleteListener { proxy.close() }
                                    }
                                }
                                provider.unbindAll()
                                provider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_FRONT_CAMERA, preview, capture, analysis)
                                imageCapture = capture
                            } catch (e: Exception) {
                                cameraError = if (isHindi) "फ्रंट कैमरा शुरू नहीं हो सका। कृपया फिर प्रयास करें।" else "Could not start the front camera. Please try again."
                            }
                        }, ContextCompat.getMainExecutor(viewContext))
                        previewView
                    },
                    modifier = Modifier.fillMaxSize()
                )

                Box(
                    Modifier.align(Alignment.Center).size(width = 250.dp, height = 330.dp)
                        .border(2.dp, Color.White.copy(alpha = 0.9f), RoundedCornerShape(140.dp))
                )

                Column(
                    Modifier.align(Alignment.BottomCenter).fillMaxWidth().background(Color(0xCC101010)).padding(14.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        faceMessage + if (isHindi) " • सामने देखें और अच्छी रोशनी रखें" else " • look forward in good lighting",
                        color = Color.White, fontSize = 11.sp
                    )
                    if (cameraError != null) {
                        Text(cameraError!!, color = Color(0xFFFFB4AB), fontSize = 11.sp, modifier = Modifier.padding(top = 8.dp))
                    }
                }
            }

            Box(Modifier.fillMaxWidth().background(Color(0xFF101010)).padding(vertical = 18.dp), contentAlignment = Alignment.Center) {
                FilledIconButton(
                    onClick = { captureSelfie() },
                    enabled = imageCapture != null && !isTakingPhoto,
                    modifier = Modifier.size(68.dp),
                    shape = CircleShape,
                    colors = IconButtonDefaults.filledIconButtonColors(containerColor = Color(0xFFC59B27), contentColor = Color(0xFF473500))
                ) {
                    if (isTakingPhoto) CircularProgressIndicator(Modifier.size(27.dp), color = Color(0xFF473500), strokeWidth = 2.dp)
                    else Icon(Icons.Default.CameraAlt, contentDescription = if (isHindi) "फोटो लें" else "Take photo", modifier = Modifier.size(29.dp))
                }
            }
        }
    }
}
