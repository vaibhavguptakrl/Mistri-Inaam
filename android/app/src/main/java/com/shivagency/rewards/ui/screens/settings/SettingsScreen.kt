package com.shivagency.rewards.ui.screens.settings

import android.content.Intent
import android.net.Uri
import android.widget.Toast
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
import com.shivagency.rewards.data.model.Plumber
import com.shivagency.rewards.data.repository.AuthRepository
import com.shivagency.rewards.ui.theme.AppColorTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    plumber: Plumber,
    currentTheme: AppColorTheme,
    onThemeChange: (AppColorTheme) -> Unit,
    isHindi: Boolean,
    onLanguageChange: (Boolean) -> Unit,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val authRepo = remember { AuthRepository(context) }
    var pinEnabled by remember { mutableStateOf(authRepo.isPinEnabled()) }
    var showWhatsAppComingSoonDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = if (isHindi) "ऐप सेटिंग्स" else "App Settings",
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

            // 2. Color Themes (Blue, Red, Charcoal+Orange)
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = if (isHindi) "रंग थीम (Color Theme)" else "Color Theme",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            // Royal Blue
                            ThemeOptionPill(
                                title = if (isHindi) "रॉयल ब्लू" else "Royal Blue",
                                primaryColor = Color(0xFF1E40AF),
                                isSelected = currentTheme == AppColorTheme.BLUE,
                                onClick = { onThemeChange(AppColorTheme.BLUE) },
                                modifier = Modifier.weight(1f)
                            )

                            // Ruby Red
                            ThemeOptionPill(
                                title = if (isHindi) "रूबी रेड" else "Ruby Red",
                                primaryColor = Color(0xFFB91C1C),
                                isSelected = currentTheme == AppColorTheme.RED,
                                onClick = { onThemeChange(AppColorTheme.RED) },
                                modifier = Modifier.weight(1f)
                            )

                            // Charcoal & Orange
                            ThemeOptionPill(
                                title = if (isHindi) "ऑरेंज" else "Orange",
                                primaryColor = Color(0xFFEA580C),
                                isSelected = currentTheme == AppColorTheme.CHARCOAL_ORANGE,
                                onClick = { onThemeChange(AppColorTheme.CHARCOAL_ORANGE) },
                                modifier = Modifier.weight(1f)
                            )
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
                                    text = if (isHindi) "ऐप खोलने पर 4-अंकीय पिन मांगें" else "Require 4-digit PIN on app launch",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        Switch(
                            checked = pinEnabled,
                            onCheckedChange = { isChecked ->
                                pinEnabled = isChecked
                                authRepo.setPinEnabled(isChecked)
                                Toast.makeText(
                                    context,
                                    if (isChecked) {
                                        if (isHindi) "पिन लॉक सक्रिय हुआ" else "PIN Lock Enabled"
                                    } else {
                                        if (isHindi) "पिन लॉक निष्क्रिय हुआ" else "PIN Lock Disabled"
                                    },
                                    Toast.LENGTH_SHORT
                                ).show()
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
                        Text(
                            text = if (isHindi) "शिव एजेंसी दुकान सहायता" else "Shiv Agency Shop Support",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                        Text(
                            text = if (isHindi) "करौली, राजस्थान — किसी भी सहायता हेतु संपर्क करें" else "Karauli, Rajasthan — Contact for any inquiries or points help",
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
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/919414000000"))
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
                                    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:9414000000"))
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
        }
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
