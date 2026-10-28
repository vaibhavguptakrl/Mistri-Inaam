package com.shivagency.rewards.ui.screens.home

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.rememberAsyncImagePainter
import com.google.firebase.firestore.FirebaseFirestore
import com.shivagency.rewards.R
import com.shivagency.rewards.data.model.GeneralSettings
import com.shivagency.rewards.data.model.Plumber
import com.shivagency.rewards.data.model.Scheme
import kotlinx.coroutines.delay

@Composable
fun HomeScreen(
    plumber: Plumber,
    isHindi: Boolean,
    onToggleLanguage: () -> Unit,
    onNavigateToStatement: () -> Unit,
    onNavigateToRedeem: () -> Unit,
    onNavigateToRefer: () -> Unit,
    onNavigateToLeaderboard: () -> Unit,
    onNavigateToHowYouEarn: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onSignOut: () -> Unit
) {
    val context = LocalContext.current
    val firestore = remember { FirebaseFirestore.getInstance() }
    var settings by remember { mutableStateOf(GeneralSettings()) }
    var activeSchemes by remember { mutableStateOf<List<Scheme>>(emptyList()) }
    var currentBannerIndex by remember { mutableStateOf(0) }

    // Load shop settings & active schemes
    LaunchedEffect(Unit) {
        firestore.collection("appSettings").document("general")
            .get()
            .addOnSuccessListener { snapshot ->
                if (snapshot != null && snapshot.exists()) {
                    settings = snapshot.toObject(GeneralSettings::class.java) ?: GeneralSettings()
                }
            }

        firestore.collection("schemes")
            .whereEqualTo("isActive", true)
            .get()
            .addOnSuccessListener { snapshot ->
                if (snapshot != null) {
                    activeSchemes = snapshot.toObjects(Scheme::class.java)
                }
            }
    }

    // Auto-scrolling banner timer (every 4 seconds)
    LaunchedEffect(activeSchemes.size) {
        if (activeSchemes.size > 1) {
            while (true) {
                delay(4000)
                currentBannerIndex = (currentBannerIndex + 1) % activeSchemes.size
            }
        }
    }

    val minPoints = settings.minRedeemPoints
    val currentPoints = plumber.pointsBalance
    val rupeeWorth = (currentPoints * settings.rupeeValuePerPoint).toLong()
    val progress = if (minPoints > 0) (currentPoints.toFloat() / minPoints.toFloat()).coerceIn(0f, 1f) else 1f

    val currentScheme = if (activeSchemes.isNotEmpty()) {
        activeSchemes[currentBannerIndex.coerceIn(0, activeSchemes.size - 1)]
    } else null

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
        ) {
            // Header Bar
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.primary)
                    .padding(horizontal = 20.dp, vertical = 16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = plumber.name,
                                color = Color.White,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Surface(
                                color = Color.White.copy(alpha = 0.2f),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = plumber.plumberCode,
                                    color = Color.White,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                        Text(
                            text = if (isHindi) "शिव एजेंसी करौली — ठेकेदार रिवॉर्ड्स" else "Shiv Agency Karauli — Contractor Rewards",
                            color = Color.White.copy(alpha = 0.8f),
                            fontSize = 11.sp
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        OutlinedButton(
                            onClick = onToggleLanguage,
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                            border = ButtonDefaults.outlinedButtonBorder.copy(brush = Brush.horizontalGradient(listOf(Color.White.copy(0.4f), Color.White.copy(0.4f)))),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp)
                        ) {
                            Text(text = if (isHindi) "English" else "हिंदी", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }

                        IconButton(onClick = onNavigateToSettings) {
                            Icon(Icons.Default.Settings, contentDescription = "Settings", tint = Color.White)
                        }

                        IconButton(onClick = onSignOut) {
                            Icon(Icons.Default.ExitToApp, contentDescription = "Sign Out", tint = Color.White)
                        }
                    }
                }
            }

            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                // KYC Warning Banner
                if (plumber.kycStatus == "pending") {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
                            Icon(Icons.Default.HourglassTop, contentDescription = "Pending", tint = Color(0xFFD97706), modifier = Modifier.size(24.dp))
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = if (isHindi) "केवाईसी सत्यापन प्रक्रियाधीन है" else "KYC Pending Verification",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = Color(0xFF92400E)
                                )
                                Text(
                                    text = if (isHindi)
                                        "आप अपने पॉइंट्स देख सकते हैं, लेकिन पॉइंट्स रिडीम करने के लिए दुकान द्वारा आधार व पैन का सत्यापन आवश्यक है।"
                                    else
                                        "You can see points earned, but redemption unlocks once shop staff verifies your Aadhaar & PAN card.",
                                    fontSize = 11.sp,
                                    color = Color(0xFFB45309),
                                    lineHeight = 16.sp
                                )
                            }
                        }
                    }
                }

                // Auto-Scrolling Promotional Banner
                Card(
                    shape = RoundedCornerShape(16.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(145.dp)
                ) {
                    Box(modifier = Modifier.fillMaxSize()) {
                        Image(
                            painter = rememberAsyncImagePainter(
                                currentScheme?.bannerUrl ?: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1000&q=80"
                            ),
                            contentDescription = "Scheme Banner",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(0.78f))))
                        )
                        Column(
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .padding(14.dp)
                        ) {
                            Text(
                                text = currentScheme?.title ?: (if (isHindi) "शिव एजेंसी प्लंबर महोत्सव" else "Shiv Agency Plumber Mahotsav"),
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp
                            )
                            Text(
                                text = currentScheme?.description ?: (if (isHindi) "विशेष दरों पर सामग्री खरीदें और अधिक अंक अर्जित करें!" else "Special earning rates on all plumbing supplies!"),
                                color = Color.White.copy(0.85f),
                                fontSize = 11.sp,
                                maxLines = 1
                            )
                        }

                        // Banner Dot indicators
                        if (activeSchemes.size > 1) {
                            Row(
                                modifier = Modifier
                                    .align(Alignment.BottomEnd)
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                for (i in activeSchemes.indices) {
                                    Box(
                                        modifier = Modifier
                                            .size(6.dp)
                                            .clip(CircleShape)
                                            .background(if (i == currentBannerIndex) Color.White else Color.White.copy(0.4f))
                                    )
                                }
                            }
                        }
                    }
                }

                // Points Balance & Rupee Worth Card
                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = if (isHindi) "कुल रिवॉर्ड बैलेंस" else "Total Reward Balance",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface.copy(0.6f)
                            )
                            Surface(
                                color = Color(0xFF10B981).copy(0.12f),
                                shape = RoundedCornerShape(20.dp)
                            ) {
                                Text(
                                    text = if (isHindi) "₹$rupeeWorth मूल्य" else "Worth ₹$rupeeWorth",
                                    color = Color(0xFF047857),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(verticalAlignment = Alignment.Bottom) {
                            Text(
                                text = "$currentPoints",
                                fontSize = 38.sp,
                                fontWeight = FontWeight.Black,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (isHindi) "अंक (Points)" else "Points",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface.copy(0.7f),
                                modifier = Modifier.padding(bottom = 6.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Progress Bar to Minimum Redemption
                        Column {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = if (isHindi) "न्यूनतम रिडेम्पशन लक्ष्य" else "Redemption Goal",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurface.copy(0.6f)
                                )
                                Text(
                                    text = "$currentPoints / $minPoints Pts",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            LinearProgressIndicator(
                                progress = progress,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(8.dp)
                                    .clip(RoundedCornerShape(4.dp)),
                                color = Color(0xFF10B981),
                                trackColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = if (currentPoints >= minPoints)
                                    (if (isHindi) "बधाई! आप पॉइंट्स रिडीम कर सकते हैं।" else "Goal reached! You can redeem points now.")
                                else
                                    (if (isHindi) "निकासी शुरू करने हेतु ${minPoints - currentPoints} पॉइंट्स और चाहिए" else "${minPoints - currentPoints} more points needed to unlock redeem"),
                                fontSize = 11.sp,
                                color = if (currentPoints >= minPoints) Color(0xFF047857) else MaterialTheme.colorScheme.onSurface.copy(0.5f),
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }

                // Quick Action Buttons Grid
                Text(
                    text = if (isHindi) "त्वरित सुविधाएं" else "Quick Actions",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    QuickButton(
                        title = if (isHindi) "खाता बही" else "Statement",
                        icon = Icons.Default.ReceiptLong,
                        color = Color(0xFF3B82F6),
                        modifier = Modifier.weight(1f),
                        onClick = onNavigateToStatement
                    )
                    QuickButton(
                        title = if (isHindi) "रिडीम करें" else "Redeem",
                        icon = Icons.Default.CardGiftcard,
                        color = Color(0xFF10B981),
                        modifier = Modifier.weight(1f),
                        onClick = onNavigateToRedeem
                    )
                    QuickButton(
                        title = if (isHindi) "मित्रों को जोड़ें" else "Refer",
                        icon = Icons.Default.Share,
                        color = Color(0xFFF59E0B),
                        modifier = Modifier.weight(1f),
                        onClick = onNavigateToRefer
                    )
                    QuickButton(
                        title = if (isHindi) "शीर्ष प्लंबर" else "Champions",
                        icon = Icons.Default.EmojiEvents,
                        color = Color(0xFF8B5CF6),
                        modifier = Modifier.weight(1f),
                        onClick = onNavigateToLeaderboard
                    )
                }

                // "How You Earn" Row (Shown when settings.showEarningRatesToPlumbers == true)
                if (settings.showEarningRatesToPlumbers) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onNavigateToHowYouEarn() }
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .background(Color(0xFF3B82F6).copy(0.12f), CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.Percent, contentDescription = null, tint = Color(0xFF2563EB), modifier = Modifier.size(20.dp))
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(
                                        text = if (isHindi) "पॉइंट्स नियम एवं दरें देखें" else "How You Earn (Point Rates)",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp
                                    )
                                    Text(
                                        text = if (isHindi) "श्रेणी व ब्रांड वार अंक तालिका" else "Category & brand wise earning rates",
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurface.copy(0.6f)
                                    )
                                }
                            }
                            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Color.Gray)
                        }
                    }
                }

                // WhatsApp Automatic Updates Coming Soon Row
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(0.4f)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Chat, contentDescription = null, tint = Color(0xFF25D366), modifier = Modifier.size(24.dp))
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = if (isHindi) "व्हाट्सएप अपडेट्स" else "WhatsApp Updates",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp
                                )
                                Text(
                                    text = if (isHindi) "हर खरीद पर व्हाट्सएप सूचना" else "Automatic WhatsApp points alert",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurface.copy(0.6f)
                                )
                            }
                        }
                        Surface(
                            color = Color.LightGray.copy(0.3f),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = if (isHindi) "जल्द उपलब्ध" else "COMING SOON",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.Gray,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun QuickButton(
    title: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 14.dp, horizontal = 4.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(color.copy(alpha = 0.12f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(imageVector = icon, contentDescription = title, tint = color, modifier = Modifier.size(22.dp))
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = title,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1
            )
        }
    }
}
