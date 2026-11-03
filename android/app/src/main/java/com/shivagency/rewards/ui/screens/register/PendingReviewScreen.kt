package com.shivagency.rewards.ui.screens.register

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shivagency.rewards.data.model.Plumber

@Composable
fun PendingReviewScreen(
    plumber: Plumber?,
    isHindi: Boolean,
    onCheckStatus: () -> Unit
) {
    val rejected = plumber?.kycStatus == "rejected"
    Column(
        modifier = Modifier.fillMaxSize().padding(28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(Icons.Default.HourglassTop, contentDescription = null, tint = Color(0xFFC59B27), modifier = Modifier.height(64.dp))
        Spacer(Modifier.height(20.dp))
        Text(
            if (rejected) (if (isHindi) "आवेदन में सुधार आवश्यक" else "Application needs attention")
            else (if (isHindi) "आवेदन समीक्षा में है" else "Application under review"),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(10.dp))
        Text(
            if (rejected) (plumber?.kycRemarks ?: if (isHindi) "कृपया शिव एजेंसी से संपर्क करें।" else "Please contact Shiv Agency for help.")
            else if (isHindi) "आपकी जानकारी शिव एजेंसी को भेज दी गई है। समीक्षा पूरी होने तक कृपया प्रतीक्षा करें।"
            else "Your details have been sent to Shiv Agency. Please wait while an admin reviews your application.",
            color = Color(0xFF625B4B), fontSize = 14.sp, lineHeight = 21.sp, textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(10.dp))
        Text(
            if (isHindi) "सदस्य कोड: ${plumber?.plumberCode.orEmpty()}" else "Application code: ${plumber?.plumberCode.orEmpty()}",
            color = Color(0xFF775A00), fontSize = 13.sp, fontWeight = FontWeight.SemiBold
        )
        Spacer(Modifier.height(24.dp))
        Button(
            onClick = onCheckStatus,
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFC59B27), contentColor = Color(0xFF473500)),
            modifier = Modifier.fillMaxWidth().height(50.dp)
        ) {
            Text(if (isHindi) "समीक्षा स्थिति जाँचें" else "Check review status", fontWeight = FontWeight.Bold)
        }
    }
}
