package com.shivagency.rewards.ui.screens.statement

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.firestore.FirebaseFirestore
import com.shivagency.rewards.R
import com.shivagency.rewards.data.model.GeneralSettings
import com.shivagency.rewards.data.model.Transaction

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StatementScreen(
    plumberId: String,
    isHindi: Boolean,
    currentBalance: Long = 0L,
    onBack: () -> Unit
) {
    val firestore = remember { FirebaseFirestore.getInstance() }
    var transactions by remember { mutableStateOf<List<Transaction>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedFilter by remember { mutableStateOf("all") }
    var searchQuery by remember { mutableStateOf("") }
    var settings by remember { mutableStateOf(GeneralSettings()) }
    var selectedTxForCalculation by remember { mutableStateOf<Transaction?>(null) }
    var loadError by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(plumberId) {
        firestore.collection("appSettings").document("general").get().addOnSuccessListener { doc ->
            if (doc.exists()) {
                settings = doc.toObject(GeneralSettings::class.java) ?: GeneralSettings()
            }
        }

    }

    // Filtering by plumberId alone avoids requiring a Firestore composite index.
    // ISO timestamps sort lexically, so order the small per-user result locally.
    DisposableEffect(plumberId) {
        isLoading = true
        loadError = null
        val registration = firestore.collection("transactions")
            .whereEqualTo("plumberId", plumberId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    loadError = error.localizedMessage ?: "Could not load your statement. Please try again."
                } else if (snapshot != null) {
                    transactions = snapshot.documents.mapNotNull { document ->
                        runCatching { document.toObject(Transaction::class.java) }.getOrNull()
                    }.sortedByDescending { it.createdAt }
                    loadError = null
                }
                isLoading = false
            }

        onDispose { registration.remove() }
    }

    val filteredByType = when (selectedFilter) {
        "purchase" -> transactions.filter { it.type == "purchase" }
        "bonus" -> transactions.filter { it.type.contains("bonus") || it.type == "referral" }
        "redemption" -> transactions.filter { it.type == "redemption" }
        else -> transactions
    }
    val filteredList = filteredByType.filter { tx ->
        val term = searchQuery.trim()
        term.isEmpty() || listOf(tx.billNumber.orEmpty(), tx.remarks.orEmpty(), tx.plumberName, tx.type)
            .any { it.contains(term, ignoreCase = true) }
    }
    val lifetimeEarned = transactions.filter { it.type != "redemption" && it.points > 0 }.sumOf { it.points }
    val lifetimeRedeemed = transactions.filter { it.type == "redemption" }.sumOf { kotlin.math.abs(it.points) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = if (isHindi) "खाता बही (पॉइंट्स स्टेटमेंट)" else "Points Statement",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold,
                        fontFamily = androidx.compose.ui.text.font.FontFamily.Serif,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                    navigationIconContentColor = MaterialTheme.colorScheme.primary
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(8.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column(Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.AccountBalanceWallet, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.width(8.dp))
                        Column {
                            Text(if (isHindi) "शिव एजेंसी डिजिटल पासबुक" else "SHIV AGENCY PASSBOOK", color = MaterialTheme.colorScheme.primary, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.7.sp)
                            Text(if (isHindi) "डिजिटल लेजर विवरण" else "Digital ledger statement", color = MaterialTheme.colorScheme.onSurface, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    Surface(color = MaterialTheme.colorScheme.surfaceVariant, shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(14.dp)) {
                            Text(if (isHindi) "सक्रिय शेष" else "Active balance", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                            Text("${currentBalance.toString().reversed().chunked(3).joinToString(",").reversed()} ${if (isHindi) "अंक" else "PTS"}", color = MaterialTheme.colorScheme.primary, fontSize = 27.sp, fontWeight = FontWeight.Bold, fontFamily = androidx.compose.ui.text.font.FontFamily.Serif)
                            Text("₹${(currentBalance * settings.rupeeValuePerPoint).toInt()} ${if (isHindi) "नकद मूल्य" else "cash value"}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                        }
                    }
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        LedgerTotal(if (isHindi) "कुल अर्जित" else "Lifetime earned", "$lifetimeEarned PTS", MaterialTheme.colorScheme.tertiary, Modifier.weight(1f))
                        LedgerTotal(if (isHindi) "कुल निकासी" else "Paid out", "$lifetimeRedeemed PTS", MaterialTheme.colorScheme.secondary, Modifier.weight(1f))
                    }
                }
            }

            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                placeholder = { Text(if (isHindi) "बिल नंबर या लेन-देन खोजें…" else "Search bill number or activity…") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                singleLine = true,
                shape = RoundedCornerShape(8.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MaterialTheme.colorScheme.primary)
            )

            // Filter Pills
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val filters = listOf(
                    "all" to if (isHindi) "सभी" else "All",
                    "purchase" to if (isHindi) "खरीददारी" else "Purchases",
                    "bonus" to if (isHindi) "बोनस" else "Bonuses",
                    "redemption" to if (isHindi) "निकासी" else "Redemptions"
                )

                filters.forEach { (key, label) ->
                    val isSelected = selectedFilter == key
                    Surface(
                        color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
                        shape = RoundedCornerShape(20.dp),
                        shadowElevation = if (isSelected) 2.dp else 0.dp,
                        border = if (!isSelected) ButtonDefaults.outlinedButtonBorder else null,
                        modifier = Modifier.clickable { selectedFilter = key }
                    ) {
                        Text(
                            text = label,
                            color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
                        )
                    }
                }
            }

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (loadError != null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(24.dp)) {
                        Text(if (isHindi) "स्टेटमेंट लोड नहीं हो सका" else "Statement could not be loaded", fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(8.dp))
                        Text(loadError.orEmpty(), color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                    }
                }
            } else if (filteredList.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.ReceiptLong, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(48.dp))
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = if (isHindi) "कोई लेनदेन नहीं मिला" else "No transactions found",
                            color = Color.Gray,
                            fontSize = 14.sp
                        )
                    }
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filteredList) { tx ->
                        Card(
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    if (tx.lines.isNotEmpty() && settings.showCalculationDetailsToPlumbers) {
                                        selectedTxForCalculation = tx
                                    }
                                }
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.Top
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = when (tx.type) {
                                                "purchase" -> if (isHindi) "सामग्री खरीद" else "Material Purchase"
                                                "welcome_bonus" -> if (isHindi) "स्वागत बोनस" else "Welcome Bonus"
                                                "referral" -> if (isHindi) "रेफरल रिवॉर्ड" else "Referral Reward"
                                                "target_bonus" -> if (isHindi) "टारगेट बोनस" else "Target Bonus"
                                                "festival_bonus" -> if (isHindi) "त्यौहार बोनस" else "Festival Bonus"
                                                "redemption" -> if (isHindi) "रिवॉर्ड निकासी" else "Redemption"
                                                else -> tx.type
                                            },
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp,
                                            color = MaterialTheme.colorScheme.onSurface
                                        )

                                        if (!tx.billNumber.isNullOrBlank()) {
                                            Text(
                                                text = if (isHindi) "बिल क्र.: ${tx.billNumber}" else "Bill #${tx.billNumber}",
                                                fontSize = 11.sp,
                                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                                            )
                                        }

                                        Text(
                                            text = tx.createdAt.take(10),
                                            fontSize = 10.sp,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                                        )
                                    }

                                    Column(horizontalAlignment = Alignment.End) {
                                        val isPositive = tx.points >= 0 && tx.type != "redemption"
                                        Text(
                                            text = "${if (isPositive) "+" else "-"}${tx.points} pts",
                                            fontWeight = FontWeight.Black,
                                            fontSize = 16.sp,
                                            color = if (isPositive) Color(0xFF10B981) else Color(0xFFEF4444)
                                        )
                                        Text(
                                            text = "₹${tx.rupeeValue} worth",
                                            fontSize = 11.sp,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                        )
                                    }
                                }

                                if (tx.lines.isNotEmpty() && settings.showCalculationDetailsToPlumbers) {
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(top = 4.dp)
                                    ) {
                                        Icon(Icons.Default.Calculate, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(
                                            text = if (isHindi) "बिल गणना देखने हेतु टैप करें" else "Tap to view bill calculation",
                                            fontSize = 11.sp,
                                            color = MaterialTheme.colorScheme.primary,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Calculation Breakdown Dialog
            if (selectedTxForCalculation != null) {
                val tx = selectedTxForCalculation!!
                AlertDialog(
                    onDismissRequest = { selectedTxForCalculation = null },
                    confirmButton = {
                        TextButton(onClick = { selectedTxForCalculation = null }) {
                            Text(if (isHindi) "बंद करें" else "Close")
                        }
                    },
                    title = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Receipt, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (isHindi) "बिल गणना विवरण" else "Bill Calculation",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    },
                    text = {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                                .padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            tx.lines.forEach { line ->
                                val brandPart = if (line.brand.isNotBlank()) " (${line.brand})" else ""
                                val calcLine = when (line.calculationType) {
                                    "PER_LITRE" -> "${line.inputQuantity} L × ₹${line.rate} = ₹${line.resultRupees.toLong()} = ${line.resultPoints} pts"
                                    "PERCENT_OF_AMOUNT" -> "₹${line.inputQuantity.toLong()} × ${line.rate}% = ₹${line.resultRupees.toLong()} = ${line.resultPoints} pts"
                                    else -> "${line.inputQuantity} pcs × ₹${line.rate} = ${line.resultPoints} pts"
                                }
                                Column {
                                    Text(
                                        text = "${line.category}$brandPart",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Text(
                                        text = calcLine,
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                    )
                                }
                            }

                            if (tx.festivalMultiplierApplied != null && tx.festivalMultiplierApplied > 1.0) {
                                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = if (isHindi) "त्यौहार दोगुने पॉइंट्स" else "Festival Double Points",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        color = Color(0xFFD97706)
                                    )
                                    Text(
                                        text = "×${tx.festivalMultiplierApplied}",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        color = Color(0xFFD97706)
                                    )
                                }
                            }

                            HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = if (isHindi) "कुल अर्जित रिवॉर्ड:" else "Total Earned:",
                                    fontWeight = FontWeight.Black,
                                    fontSize = 13.sp
                                )
                                Text(
                                    text = "${tx.points} pts (₹${tx.rupeeValue})",
                                    fontWeight = FontWeight.Black,
                                    fontSize = 13.sp,
                                    color = Color(0xFF10B981)
                                )
                            }
                        }
                    }
                )
            }
        }
    }
}

@Composable
private fun LedgerTotal(label: String, value: String, tint: Color, modifier: Modifier = Modifier) {
    Surface(color = Color.White, shape = RoundedCornerShape(6.dp), border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant), modifier = modifier) {
        Column(Modifier.padding(10.dp)) {
            Text(label, color = tint, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
            Text(value, color = MaterialTheme.colorScheme.onSurface, fontSize = 15.sp, fontWeight = FontWeight.Bold)
        }
    }
}
