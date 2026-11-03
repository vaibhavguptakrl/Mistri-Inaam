package com.shivagency.rewards.ui.screens.settings

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.functions.FirebaseFunctions
import com.shivagency.rewards.data.model.GeneralSettings
import com.shivagency.rewards.data.model.Plumber
import com.shivagency.rewards.data.repository.AuthRepository
import kotlinx.coroutines.tasks.await

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    plumber: Plumber,
    isHindi: Boolean,
    onLanguageChange: (Boolean) -> Unit,
    onBack: () -> Unit,
    onEnablePinLock: () -> Unit,
    onSignOut: () -> Unit
) {
    val context = LocalContext.current
    val authRepo = remember { AuthRepository(context) }
    val firestore = remember { FirebaseFirestore.getInstance() }
    var generalSettings by remember { mutableStateOf(GeneralSettings()) }
    var pinEnabled by remember { mutableStateOf(authRepo.isPinEnabled()) }
    var showWhatsAppComingSoonDialog by remember { mutableStateOf(false) }
    var showSignOutDialog by remember { mutableStateOf(false) }
    var showDeleteAccountDialog by remember { mutableStateOf(false) }
    var deletionRequestPending by remember { mutableStateOf(false) }
    var deletionRequestSending by remember { mutableStateOf(false) }

    LaunchedEffect(plumber.id) {
        firestore.collection("appSettings").document("general")
            .get()
            .addOnSuccessListener { doc ->
                if (doc != null && doc.exists()) {
                    generalSettings = doc.toObject(GeneralSettings::class.java) ?: GeneralSettings()
                }
            }

        try {
            deletionRequestPending = firestore.collection("accountDeletionRequests").document(plumber.id)
                .get().await().getString("status") in listOf("pending", "processing")
        } catch (_: Exception) {
            // Keep the request action available if reading its status is temporarily unavailable.
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = if (isHindi) "ऐप सेटिंग्स" else "App Settings",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 18.sp,
                        fontFamily = androidx.compose.ui.text.font.FontFamily.Serif
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
            // Profile Summary Header
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = plumber.name.take(1).uppercase(),
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                                fontSize = 20.sp
                            )
                        }
                        Spacer(modifier = Modifier.width(14.dp))
                        Column {
                            Text(
                                text = plumber.name,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                            Text(
                                text = "${plumber.plumberCode} • ${plumber.phone}",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            // 1. Language Preference
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = if (isHindi) "भाषा चुनें (Language)" else "Select Language",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            OutlinedButton(
                                onClick = { onLanguageChange(true) },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp),
                                colors = if (isHindi) ButtonDefaults.outlinedButtonColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                                else ButtonDefaults.outlinedButtonColors()
                            ) {
                                Text(
                                    text = "हिंदी (Hindi)",
                                    fontWeight = if (isHindi) FontWeight.Bold else FontWeight.Normal,
                                    fontSize = 13.sp
                                )
                            }

                            OutlinedButton(
                                onClick = { onLanguageChange(false) },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp),
                                colors = if (!isHindi) ButtonDefaults.outlinedButtonColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                                else ButtonDefaults.outlinedButtonColors()
                            ) {
                                Text(
                                    text = "English",
                                    fontWeight = if (!isHindi) FontWeight.Bold else FontWeight.Normal,
                                    fontSize = 13.sp
                                )
                            }
                        }
                    }
                }
            }

            // 2. Stitch design identity
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(if (isHindi) "दिखावट" else "App appearance", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(if (isHindi) "एग्ज़ीक्यूटिव हेरिटेज • हाथीदाँत, शैम्पेन गोल्ड और एमराल्ड" else "Executive Heritage • alabaster ivory, champagne gold and emerald", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                        Spacer(modifier = Modifier.height(12.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            listOf(Color(0xFFFAF9F6), Color(0xFFC59B27), Color(0xFF006C4A), Color(0xFF0F172A)).forEach { swatch ->
                                Box(Modifier.size(23.dp).background(swatch, CircleShape).border(1.dp, MaterialTheme.colorScheme.outlineVariant, CircleShape))
                            }
                            Text(if (isHindi) "सभी स्क्रीन पर एक समान ब्रांड शैली" else "One consistent brand style across every screen", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                        }
                    }
                }
            }

            // 3. Security & PIN Lock
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Lock,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = if (isHindi) "ऐप पिन लॉक (PIN Lock)" else "App PIN Lock",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                                Text(
                                    text = if (isHindi) "4-अंकीय पिन बनाएं; उपलब्ध होने पर फिंगरप्रिंट भी इस्तेमाल करें" else "Create a 4-digit PIN; use fingerprint when available",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        Switch(
                            checked = pinEnabled,
                            onCheckedChange = { isChecked ->
                                if (isChecked) {
                                    onEnablePinLock()
                                } else {
                                    pinEnabled = false
                                    authRepo.setPinEnabled(false)
                                    Toast.makeText(
                                        context,
                                        if (isHindi) "पिन लॉक निष्क्रिय हुआ" else "PIN Lock Disabled",
                                        Toast.LENGTH_SHORT
                                    ).show()
                                }
                            }
                        )
                    }
                }
            }

            // 4. WHATSAPP AUTOMATIC UPDATES (COMING SOON ROW - REQUIREMENT 12)
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { showWhatsAppComingSoonDialog = true },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Message,
                                contentDescription = null,
                                tint = Color(0xFF64748B),
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = if (isHindi) "व्हाट्सएप स्वचालित सूचनाएं" else "WhatsApp Automatic Updates",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = Color(0xFF64748B)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Surface(
                                        color = Color(0xFFFEF3C7),
                                        shape = RoundedCornerShape(4.dp)
                                    ) {
                                        Text(
                                            text = if (isHindi) "जल्द उपलब्ध" else "COMING SOON",
                                            color = Color(0xFF92400E),
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                                Text(
                                    text = if (isHindi) "पॉइंट्स व बिल की रसीद व्हाट्सएप पर प्राप्त करें" else "Receive points receipt & redemptions on WhatsApp",
                                    fontSize = 11.sp,
                                    color = Color(0xFF94A3B8)
                                )
                            }
                        }

                        // Disabled Switch indicator
                        Switch(
                            checked = false,
                            enabled = false,
                            onCheckedChange = {}
                        )
                    }
                }
            }

            // 5. Shop Support & Direct WhatsApp Chat
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        val shopName = if (generalSettings.shopName.isNotBlank()) generalSettings.shopName else "Shiv Agency"
                        val shopLocation = if (generalSettings.shopLocation.isNotBlank()) generalSettings.shopLocation else "Karauli, Rajasthan"
                        val rawDigits = generalSettings.supportPhone.filter { it.isDigit() }
                        val dialPhone = if (rawDigits.isNotBlank()) rawDigits else "9414000000"
                        val waPhone = if (dialPhone.startsWith("91")) dialPhone else "91$dialPhone"

                        Text(
                            text = if (isHindi) "$shopName दुकान सहायता" else "$shopName Shop Support",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                        Text(
                            text = if (isHindi) "$shopLocation — किसी भी सहायता हेतु संपर्क करें" else "$shopLocation — Contact for any inquiries or points help",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 2.dp, bottom = 12.dp)
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Button(
                                onClick = {
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/$waPhone"))
                                    context.startActivity(intent)
                                },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(text = "WhatsApp Chat", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }

                            OutlinedButton(
                                onClick = {
                                    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$dialPhone"))
                                    context.startActivity(intent)
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Default.Phone, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(text = if (isHindi) "कॉल करें" else "Call Shop", fontSize = 12.sp)
                            }
                        }
                    }
                }
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                ) {
                    Column(Modifier.fillMaxWidth().padding(16.dp)) {
                        Text(if (isHindi) "गोपनीयता और डेटा" else "Privacy and data", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text(
                            if (isHindi) "गोपनीयता नीति देखें या खाता हटाने का अनुरोध करें।" else "Read the privacy policy or request deletion of your account.",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 4.dp, bottom = 12.dp)
                        )
                        OutlinedButton(
                            onClick = {
                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://sa-mistri-inaam.web.app/privacy")))
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.PrivacyTip, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(if (isHindi) "गोपनीयता नीति" else "Privacy policy")
                        }
                        TextButton(
                            onClick = { showDeleteAccountDialog = true },
                            enabled = !deletionRequestPending && !deletionRequestSending,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.DeleteForever, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                            Spacer(Modifier.width(8.dp))
                            Text(
                                when {
                                    deletionRequestPending -> if (isHindi) "अनुरोध भेजा गया" else "Deletion request submitted"
                                    deletionRequestSending -> if (isHindi) "अनुरोध भेज रहे हैं…" else "Submitting request…"
                                    else -> if (isHindi) "खाता हटाने का अनुरोध" else "Request account deletion"
                                },
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                    }
                }
            }

            item {
                OutlinedButton(
                    onClick = { showSignOutDialog = true },
                    modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp).height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.error),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
                ) {
                    Icon(Icons.Default.Logout, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(if (isHindi) "लॉग आउट" else "Sign out", fontWeight = FontWeight.Bold)
                }
            }
        }
    }

    if (showDeleteAccountDialog) {
        AlertDialog(
            onDismissRequest = { if (!deletionRequestSending) showDeleteAccountDialog = false },
            icon = { Icon(Icons.Default.DeleteForever, contentDescription = null, tint = MaterialTheme.colorScheme.error) },
            title = { Text(if (isHindi) "खाता हटाने का अनुरोध?" else "Request account deletion?") },
            text = {
                Text(
                    if (isHindi)
                        "हम आपका अनुरोध शिव एजेंसी को भेजेंगे। शेष रिडीम न किए गए पॉइंट समाप्त हो जाएंगे। लंबित भुगतान पूरे होने और पहचान की पुष्टि के बाद खाता और हटाने योग्य व्यक्तिगत डेटा हटाया जाएगा। कानून या वित्तीय रिकॉर्ड के लिए आवश्यक जानकारी रखी जा सकती है।"
                    else
                        "We will send this request to Shiv Agency. Any unredeemed points will be forfeited. After verifying your identity and resolving pending payouts, the account and eligible personal data will be deleted. Information required for legal or financial records may be retained."
                )
            },
            confirmButton = {
                TextButton(
                    enabled = !deletionRequestSending,
                    onClick = {
                        deletionRequestSending = true
                        FirebaseFunctions.getInstance("asia-south1").getHttpsCallable("requestAccountDeletion").call()
                            .addOnSuccessListener {
                                deletionRequestSending = false
                                deletionRequestPending = true
                                showDeleteAccountDialog = false
                                Toast.makeText(context, if (isHindi) "अनुरोध भेज दिया गया" else "Deletion request submitted", Toast.LENGTH_LONG).show()
                            }
                            .addOnFailureListener { error ->
                                deletionRequestSending = false
                                Toast.makeText(context, error.localizedMessage ?: if (isHindi) "अनुरोध नहीं भेजा जा सका" else "Could not submit request", Toast.LENGTH_LONG).show()
                            }
                    }
                ) { Text(if (isHindi) "अनुरोध भेजें" else "Submit request", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteAccountDialog = false }) {
                    Text(if (isHindi) "रद्द करें" else "Cancel")
                }
            }
        )
    }

    // WHATSAPP COMING SOON ALERT DIALOG
    if (showWhatsAppComingSoonDialog) {
        AlertDialog(
            onDismissRequest = { showWhatsAppComingSoonDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = null,
                        tint = Color(0xFFD97706),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isHindi) "व्हाट्सएप सूचनाएं - जल्द आ रहा है" else "WhatsApp Updates - Coming Soon",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            },
            text = {
                Text(
                    text = if (isHindi)
                        "स्वचालित व्हाट्सएप मैसेज सूचनाएं जल्द ही शुरू होंगी! शिव एजेंसी वर्तमान में मेटा (WhatsApp Cloud API) के साथ व्यावसायिक सत्यापन व सेटअप पूर्ण कर रही है। तब तक आप सीधे दुकान से चैट करने हेतु होम स्क्रीन पर दिए गए व्हाट्सएप बटन का उपयोग कर सकते हैं।"
                    else
                        "Automated WhatsApp message updates are coming soon! Shiv Agency is currently completing business verification with the official Meta WhatsApp Cloud API. In the meantime, you can use the direct WhatsApp button on the home screen to chat with the shop.",
                    fontSize = 13.sp,
                    lineHeight = 18.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            confirmButton = {
                Button(
                    onClick = { showWhatsAppComingSoonDialog = false },
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(if (isHindi) "ठीक है" else "Got It")
                }
            }
        )
    }

    if (showSignOutDialog) {
        AlertDialog(
            onDismissRequest = { showSignOutDialog = false },
            icon = { Icon(Icons.Default.Logout, contentDescription = null, tint = MaterialTheme.colorScheme.error) },
            title = { Text(if (isHindi) "लॉग आउट करें?" else "Sign out?") },
            text = { Text(if (isHindi) "आप इस डिवाइस से अपने खाते से बाहर हो जाएंगे।" else "You will be signed out of your account on this device.") },
            confirmButton = {
                TextButton(onClick = {
                    showSignOutDialog = false
                    onSignOut()
                }) {
                    Text(if (isHindi) "लॉग आउट" else "Sign out", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showSignOutDialog = false }) {
                    Text(if (isHindi) "रद्द करें" else "Cancel")
                }
            }
        )
    }
}

@Composable
fun ThemeOptionPill(
    title: String,
    primaryColor: Color,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(10.dp),
        border = BorderStroke(
            width = if (isSelected) 2.dp else 1.dp,
            color = if (isSelected) primaryColor else Color(0xFFCBD5E1)
        ),
        color = if (isSelected) primaryColor.copy(alpha = 0.08f) else Color.Transparent,
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(vertical = 12.dp, horizontal = 6.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(20.dp)
                    .clip(CircleShape)
                    .background(primaryColor)
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = title,
                fontSize = 11.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = if (isSelected) primaryColor else Color(0xFF475569)
            )
        }
    }
}
