package com.shivagency.rewards.ui.screens.refer

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.firestore.FirebaseFirestore
import com.shivagency.rewards.data.model.GeneralSettings
import com.shivagency.rewards.data.model.Plumber

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReferScreen(
    plumber: Plumber,
    isHindi: Boolean,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val firestore = remember { FirebaseFirestore.getInstance() }

    var referredPlumbers by remember { mutableStateOf<List<Plumber>>(emptyList()) }
    var generalSettings by remember { mutableStateOf(GeneralSettings()) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(plumber.plumberCode) {
        isLoading = true
        // 1. Load Settings for referral bonus points
        firestore.collection("appSettings").document("general")
            .get()
            .addOnSuccessListener { doc ->
                if (doc.exists()) {
                    generalSettings = doc.toObject(GeneralSettings::class.java) ?: GeneralSettings()
                }
            }

        // 2. Query plumbers who used this plumber's referral code
        if (plumber.plumberCode.isNotEmpty()) {
            firestore.collection("plumbers")
                .whereEqualTo("referredBy", plumber.plumberCode)
                .get()
                .addOnSuccessListener { snap ->
                    val list = mutableListOf<Plumber>()
                    for (d in snap.documents) {
                        val p = d.toObject(Plumber::class.java)
                        if (p != null) list.add(p.copy(id = d.id))
                    }
                    referredPlumbers = list
                    isLoading = false
                }
                .addOnFailureListener {
                    isLoading = false
                }
        } else {
            isLoading = false
        }
    }

    // Share Referral Intent
    fun shareReferralCode() {
        val shareText = if (isHindi) {
            "शिव एजेंसी (करौली) प्लंबर रिवॉर्ड्स ऐप! मेरे रेफरल कोड *${plumber.plumberCode}* का उपयोग करके ऐप पर रजिस्टर करें और पाएं 500 वेलकम बोनस अंक! पाइप व फिटिंग्स पर हर बिल पर रिवॉर्ड पाएं।"
        } else {
            "Join Shiv Agency (Karauli) Loyalty Rewards App! Use my referral code *${plumber.plumberCode}* on registration to get 500 Welcome Bonus points. Earn points on every plumbing purchase!"
        }

        val sendIntent = Intent().apply {
            action = Intent.ACTION_SEND
            putExtra(Intent.EXTRA_TEXT, shareText)
            type = "text/plain"
        }
        val shareIntent = Intent.createChooser(sendIntent, if (isHindi) "रेफरल कोड शेयर करें" else "Share Referral Code")
        context.startActivity(shareIntent)
    }

    // Copy to clipboard
    fun copyCodeToClipboard() {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("Referral Code", plumber.plumberCode)
        clipboard.setPrimaryClip(clip)
        Toast.makeText(
            context,
            if (isHindi) "कोड कॉपी हो गया: ${plumber.plumberCode}" else "Code copied: ${plumber.plumberCode}",
            Toast.LENGTH_SHORT
        ).show()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = if (isHindi) "रेफर करें और कमाएं" else "Refer & Earn",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Hero Referral Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                Brush.verticalGradient(
                                    listOf(Color(0xFF0F172A), Color(0xFF1E293B))
                                )
                            )
                            .padding(20.dp)
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = if (isHindi) "आपका विशिष्ट रेफरल कोड" else "Your Unique Referral Code",
                                color = Color(0xFF94A3B8),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            Spacer(modifier = Modifier.height(8.dp))

                            // Code Display Pill
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = Color.White.copy(alpha = 0.1f),
                                border = ButtonDefaults.outlinedButtonBorder.copy(
                                    brush = Brush.horizontalGradient(listOf(Color(0xFF38BDF8), Color(0xFF818CF8)))
                                ),
                                modifier = Modifier.clickable { copyCodeToClipboard() }
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp)
                                ) {
                                    Text(
                                        text = plumber.plumberCode,
                                        fontSize = 26.sp,
                                        fontWeight = FontWeight.Black,
                                        letterSpacing = 2.sp,
                                        color = Color(0xFF38BDF8)
                                    )
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Icon(
                                        imageVector = Icons.Default.ContentCopy,
                                        contentDescription = "Copy",
                                        tint = Color.White.copy(0.8f),
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(14.dp))
                            Text(
                                text = if (isHindi) "साथी प्लंबरों को रेफर करें। उनकी पहली खरीदारी पर आपको ${generalSettings.referralBonus} बोनस अंक मिलेंगे!"
                                else "Invite fellow plumbers. When they make their first purchase, you earn ${generalSettings.referralBonus} bonus points!",
                                color = Color(0xFFE2E8F0),
                                fontSize = 12.sp,
                                lineHeight = 18.sp,
                                modifier = Modifier.padding(horizontal = 8.dp)
                            )

                            Spacer(modifier = Modifier.height(18.dp))

                            // Share Button
                            Button(
                                onClick = { shareReferralCode() },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                            ) {
                                Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = if (isHindi) "व्हाट्सएप / दोस्तों के साथ शेयर करें" else "Share via WhatsApp / Friends",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                            }
                        }
                    }
                }
            }

            // How It Works Steps
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = if (isHindi) "रेफरल कैसे काम करता है?" else "How Referral Works",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        StepRow(
                            stepNumber = "1",
                            title = if (isHindi) "कोड साझा करें" else "Share Your Code",
                            description = if (isHindi) "अपने साथी प्लंबरों को शिव एजेंसी रिवॉर्ड्स में आमंत्रित करें।" else "Send your unique code via WhatsApp or SMS."
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        StepRow(
                            stepNumber = "2",
                            title = if (isHindi) "दोस्त रजिस्टर करेगा" else "Friend Signs Up",
                            description = if (isHindi) "पंजीकरण करते समय आपका कोड दर्ज करेगा और उसे 500 अंक मिलेंगे।" else "They enter your code during KYC registration."
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        StepRow(
                            stepNumber = "3",
                            title = if (isHindi) "पहली खरीदारी पर इनाम" else "Earn on First Purchase",
                            description = if (isHindi) "जब वे दुकान से पहली बार सामान खरीदेंगे, आपको ${generalSettings.referralBonus} अंक मिलेंगे!" else "When they make their first bill purchase, you get bonus points."
                        )
                    }
                }
            }

            // Summary Stats
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFEFF6FF))
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = if (isHindi) "कुल रेफरल" else "Total Referrals",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1E40AF)
                            )
                            Text(
                                text = "${referredPlumbers.size}",
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFF1E3A8A),
                                modifier = Modifier.padding(top = 2.dp)
                            )
                        }
                    }

                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFECFDF5))
                    ) {
                        val activePurchases = referredPlumbers.count { (it.lifetimeEarned ?: 0) > 0 }
                        val earnedPoints = activePurchases * generalSettings.referralBonus
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = if (isHindi) "अर्जित बोनस अंक" else "Bonus Earned",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF065F46)
                            )
                            Text(
                                text = "$earnedPoints pts",
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFF047857),
                                modifier = Modifier.padding(top = 2.dp)
                            )
                        }
                    }
                }
            }

            // My Referrals List Header
            item {
                Text(
                    text = if (isHindi) "मेरे रेफरल ठेकेदार (${referredPlumbers.size})" else "My Referred Plumbers (${referredPlumbers.size})",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }

            // List of Referred Plumbers
            if (referredPlumbers.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.GroupAdd,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                                modifier = Modifier.size(36.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = if (isHindi) "अभी तक कोई रेफरल नहीं है" else "No referrals yet",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = if (isHindi) "अपना कोड साझा करें और प्रत्येक रेफरल पर अंक कमाएं!" else "Share your code above to start earning bonus points!",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f)
                            )
                        }
                    }
                }
            } else {
                items(referredPlumbers) { ref ->
                    val hasPurchased = (ref.lifetimeEarned ?: 0) > 0
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(
                                    text = ref.name,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                                Text(
                                    text = "${ref.plumberCode} • ${ref.phone.take(6)}****",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }

                            if (hasPurchased) {
                                Surface(
                                    color = Color(0xFFD1FAE5),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = "+${generalSettings.referralBonus} pts",
                                        fontWeight = FontWeight.Black,
                                        fontSize = 12.sp,
                                        color = Color(0xFF065F46),
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            } else {
                                Surface(
                                    color = Color(0xFFFEF3C7),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = if (isHindi) "पहली खरीद प्रतीक्षित" else "Awaiting 1st Bill",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 10.sp,
                                        color = Color(0xFF92400E),
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
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

@Composable
fun StepRow(stepNumber: String, title: String, description: String) {
    Row(verticalAlignment = Alignment.Top) {
        Box(
            modifier = Modifier
                .size(24.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = stepNumber,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 11.sp
            )
        }
        Spacer(modifier = Modifier.width(10.dp))
        Column {
            Text(text = title, fontWeight = FontWeight.Bold, fontSize = 13.sp)
            Text(
                text = description,
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
