package com.shivagency.rewards.ui.screens.redeem

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.shivagency.rewards.data.model.CatalogueItem
import com.shivagency.rewards.data.model.FeatureControls
import com.shivagency.rewards.data.model.GeneralSettings
import com.shivagency.rewards.data.model.Plumber
import com.shivagency.rewards.data.model.RedemptionRequest
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RedeemScreen(
    plumber: Plumber,
    isHindi: Boolean,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val firestore = remember { FirebaseFirestore.getInstance() }

    var selectedTab by remember { mutableStateOf(0) } // 0: UPI, 1: Vouchers, 2: Tools, 3: History
    var generalSettings by remember { mutableStateOf(GeneralSettings()) }
    var featureControls by remember { mutableStateOf(FeatureControls()) }
    var catalogueItems by remember { mutableStateOf<List<CatalogueItem>>(emptyList()) }
    var redemptionHistory by remember { mutableStateOf<List<RedemptionRequest>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    // UPI Form State
    var upiIdInput by remember { mutableStateOf("") }
    var upiPointsInput by remember { mutableStateOf("3000") }
    var isSubmitting by remember { mutableStateOf(false) }

    // Selected item for confirmation dialog
    var itemToRedeem by remember { mutableStateOf<CatalogueItem?>(null) }
    var showUpiConfirmDialog by remember { mutableStateOf(false) }

    // Load Live Settings, Features, Catalogue, and History
    fun loadAllData() {
        isLoading = true
        // 1. Settings
        firestore.collection("appSettings").document("general")
            .get()
            .addOnSuccessListener { doc ->
                if (doc.exists()) {
                    generalSettings = doc.toObject(GeneralSettings::class.java) ?: GeneralSettings()
                    upiPointsInput = generalSettings.minRedeemPoints.toString()
                }
            }

        // 2. Feature Controls
        firestore.collection("appSettings").document("features")
            .get()
            .addOnSuccessListener { doc ->
                if (doc.exists()) {
                    featureControls = doc.toObject(FeatureControls::class.java) ?: FeatureControls()
                }
            }

        // 3. Catalogue items
        firestore.collection("catalogue")
            .whereEqualTo("inStock", true)
            .get()
            .addOnSuccessListener { snap ->
                val list = mutableListOf<CatalogueItem>()
                for (d in snap.documents) {
                    val item = d.toObject(CatalogueItem::class.java)
                    if (item != null) list.add(item.copy(id = d.id))
                }
                catalogueItems = list
            }

        // 4. Redemption History
        firestore.collection("redemptionRequests")
            .whereEqualTo("plumberId", plumber.id)
            .get()
            .addOnSuccessListener { snap ->
                val list = mutableListOf<RedemptionRequest>()
                for (d in snap.documents) {
                    val req = d.toObject(RedemptionRequest::class.java)
                    if (req != null) list.add(req.copy(id = d.id))
                }
                // Sort by date desc
                list.sortByDescending { it.createdAt }
                redemptionHistory = list
                isLoading = false
            }
            .addOnFailureListener {
                isLoading = false
            }
    }

    LaunchedEffect(plumber.id) {
        loadAllData()
    }

    // Submission handler
    fun submitRedemptionRequest(
        method: String,
        points: Long,
        rupeeValue: Double,
        upiId: String? = null,
        voucherDetails: String? = null,
        toolDetails: String? = null
    ) {
        isSubmitting = true
        val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(Date())
        val reqId = UUID.randomUUID().toString()

        val request = RedemptionRequest(
            id = reqId,
            plumberId = plumber.id,
            plumberCode = plumber.plumberCode,
            plumberName = plumber.name,
            plumberPhone = plumber.phone,
            points = points,
            rupeeValue = rupeeValue,
            method = method,
            upiId = upiId,
            voucherDetails = voucherDetails,
            toolDetails = toolDetails,
            status = "pending",
            createdAt = now,
            updatedAt = now
        )

        firestore.collection("redemptionRequests").document(reqId)
            .set(request)
            .addOnSuccessListener {
                isSubmitting = false
                itemToRedeem = null
                showUpiConfirmDialog = false
                Toast.makeText(
                    context,
                    if (isHindi) "रिडेम्पशन अनुरोध सफलतापूर्वक जमा हुआ! शिव एजेंसी द्वारा जल्द भुगतान होगा।"
                    else "Redemption request submitted! Shiv Agency will process it shortly.",
                    Toast.LENGTH_LONG
                ).show()
                selectedTab = 3 // Switch to history tab
                loadAllData()
            }
            .addOnFailureListener { e ->
                isSubmitting = false
                Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            }
    }

    val isKycApproved = plumber.kycStatus == "approved"
    val minPoints = generalSettings.minRedeemPoints
    val hasEnoughPoints = plumber.pointsBalance >= minPoints
    val canRedeem = isKycApproved && hasEnoughPoints

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = if (isHindi) "इनाम रिडीम करें" else "Redeem Rewards",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                        Text(
                            text = if (isHindi) "उपलब्ध बैलेंस: ${plumber.pointsBalance} अंक (₹${(plumber.pointsBalance * generalSettings.rupeeValuePerPoint).toInt()})"
                            else "Available: ${plumber.pointsBalance} pts (₹${(plumber.pointsBalance * generalSettings.rupeeValuePerPoint).toInt()})",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // KYC or Minimum Points Warning Card
            if (!isKycApproved) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = null,
                            tint = Color(0xFFD97706),
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = if (isHindi) "KYC सत्यापन विचाराधीन है" else "KYC Verification Pending",
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF92400E),
                                fontSize = 13.sp
                            )
                            Text(
                                text = if (isHindi) "शिव एजेंसी द्वारा आपका आधार व पैन कार्ड सत्यापित होने के बाद ही पॉइंट रिडीम किए जा सकेंगे।"
                                else "Points redemption unlocks once shop staff verifies your Aadhaar & PAN card.",
                                color = Color(0xFFB45309),
                                fontSize = 11.sp
                            )
                        }
                    }
                }
            } else if (!hasEnoughPoints) {
                val needed = minPoints - plumber.pointsBalance
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFEFF6FF)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = if (isHindi) "न्यूनतम रिडेम्पशन लक्ष्य" else "Minimum Redeem Goal",
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1E40AF),
                                fontSize = 13.sp
                            )
                            Text(
                                text = "${plumber.pointsBalance} / $minPoints pts",
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1E40AF),
                                fontSize = 12.sp
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        val progress = (plumber.pointsBalance.toFloat() / minPoints.toFloat()).coerceIn(0f, 1f)
                        LinearProgressIndicator(
                            progress = progress,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp)),
                            color = Color(0xFF2563EB),
                            trackColor = Color(0xFFBFDBFE)
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = if (isHindi) "निकासी के लिए $needed और अंकों की आवश्यकता है।"
                            else "You need $needed more points to unlock redemption.",
                            fontSize = 11.sp,
                            color = Color(0xFF3B82F6)
                        )
                    }
                }
            }

            // Tabs Header
            ScrollableTabRow(
                selectedTabIndex = selectedTab,
                edgePadding = 16.dp,
                containerColor = MaterialTheme.colorScheme.surface
            ) {
                if (featureControls.redemptionUpi) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = { Text(if (isHindi) "UPI नकद" else "UPI Cash") },
                        icon = { Icon(Icons.Default.AccountBalance, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    )
                }
                if (featureControls.redemptionVoucher) {
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = { Text(if (isHindi) "वाउचर" else "Vouchers") },
                        icon = { Icon(Icons.Default.CardGiftcard, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    )
                }
                if (featureControls.redemptionTools) {
                    Tab(
                        selected = selectedTab == 2,
                        onClick = { selectedTab = 2 },
                        text = { Text(if (isHindi) "प्लंबर औजार" else "Tools") },
                        icon = { Icon(Icons.Default.Build, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    )
                }
                Tab(
                    selected = selectedTab == 3,
                    onClick = { selectedTab = 3 },
                    text = {
                        Text(
                            if (isHindi) "इतिहास (${redemptionHistory.size})"
                            else "History (${redemptionHistory.size})"
                        )
                    },
                    icon = { Icon(Icons.Default.History, contentDescription = null, modifier = Modifier.size(18.dp)) }
                )
            }

            // TAB 0: UPI CASH
            if (selectedTab == 0) {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = if (isHindi) "सीधे बैंक खाते में UPI ट्रांसफर" else "Direct UPI Bank Transfer",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp
                                )
                                Text(
                                    text = if (isHindi) "अंकों को नकद में बदलकर अपने Google Pay, PhonePe, Paytm या BHIM UPI खाते में प्राप्त करें। 1 अंक = ₹${generalSettings.rupeeValuePerPoint}।"
                                    else "Convert points directly to cash into your Google Pay, PhonePe, Paytm or BHIM UPI ID. 1 pt = ₹${generalSettings.rupeeValuePerPoint}.",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(top = 4.dp)
                                )
                            }
                        }
                    }

                    item {
                        OutlinedTextField(
                            value = upiIdInput,
                            onValueChange = { upiIdInput = it.trim() },
                            label = { Text(if (isHindi) "UPI ID दर्ज करें" else "Enter UPI ID") },
                            placeholder = { Text("e.g. 9876543210@upi or name@okhdfcbank") },
                            leadingIcon = { Icon(Icons.Default.Payment, contentDescription = null) },
                            singleLine = true,
                            enabled = canRedeem,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    item {
                        val pts = upiPointsInput.toLongOrNull() ?: 0L
                        val rupees = (pts * generalSettings.rupeeValuePerPoint).toInt()

                        OutlinedTextField(
                            value = upiPointsInput,
                            onValueChange = { upiPointsInput = it.filter { c -> c.isDigit() } },
                            label = { Text(if (isHindi) "रिडीम करने के अंक" else "Points to Redeem") },
                            supportingText = {
                                Text(
                                    if (isHindi) "नकद मूल्य: ₹$rupees (न्यूनतम: $minPoints अंक)"
                                    else "Cash Value: ₹$rupees (Minimum: $minPoints pts)"
                                )
                            },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            leadingIcon = { Icon(Icons.Default.MonetizationOn, contentDescription = null) },
                            singleLine = true,
                            enabled = canRedeem,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    item {
                        val pts = upiPointsInput.toLongOrNull() ?: 0L
                        val isUpiValid = upiIdInput.contains("@") && upiIdInput.length >= 5
                        val isPointsValid = pts >= minPoints && pts <= plumber.pointsBalance

                        Button(
                            onClick = { showUpiConfirmDialog = true },
                            enabled = canRedeem && isUpiValid && isPointsValid && !isSubmitting,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text(
                                text = if (isHindi) "UPI नकद अनुरोध सबमिट करें" else "Request UPI Cash",
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp
                            )
                        }
                    }
                }
            }

            // TAB 1: SHOPPING VOUCHERS
            if (selectedTab == 1) {
                val vouchers = catalogueItems.filter { it.category == "voucher" }
                if (vouchers.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            text = if (isHindi) "वर्तमान में कोई वाउचर उपलब्ध नहीं है" else "No vouchers available right now",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 14.sp
                        )
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(vouchers) { voucher ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    if (!voucher.imageUrl.isNullOrEmpty()) {
                                        AsyncImage(
                                            model = voucher.imageUrl,
                                            contentDescription = voucher.name,
                                            modifier = Modifier
                                                .size(60.dp)
                                                .clip(RoundedCornerShape(8.dp))
                                        )
                                    } else {
                                        Box(
                                            modifier = Modifier
                                                .size(60.dp)
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(Color(0xFFEDE9FE)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(Icons.Default.CardGiftcard, contentDescription = null, tint = Color(0xFF7C3AED))
                                        }
                                    }

                                    Spacer(modifier = Modifier.width(12.dp))

                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = voucher.name,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp
                                        )
                                        Text(
                                            text = voucher.description,
                                            fontSize = 11.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            maxLines = 2
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = "${voucher.pointsCost} pts (₹${voucher.rupeeValue.toInt()})",
                                            fontWeight = FontWeight.ExtraBold,
                                            color = MaterialTheme.colorScheme.primary,
                                            fontSize = 13.sp
                                        )
                                    }

                                    Spacer(modifier = Modifier.width(8.dp))

                                    val isAffordable = plumber.pointsBalance >= voucher.pointsCost
                                    Button(
                                        onClick = { itemToRedeem = voucher },
                                        enabled = canRedeem && isAffordable && !isSubmitting,
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                    ) {
                                        Text(if (isHindi) "रिडीम" else "Claim", fontSize = 12.sp)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // TAB 2: PLUMBER TOOLS & EQUIPMENT
            if (selectedTab == 2) {
                val tools = catalogueItems.filter { it.category == "tool" }
                if (tools.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            text = if (isHindi) "वर्तमान में कोई औजार सूची में नहीं हैं" else "No tools available in catalogue right now",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 14.sp
                        )
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        items(tools) { tool ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        if (!tool.imageUrl.isNullOrEmpty()) {
                                            AsyncImage(
                                                model = tool.imageUrl,
                                                contentDescription = tool.name,
                                                modifier = Modifier
                                                    .size(64.dp)
                                                    .clip(RoundedCornerShape(8.dp))
                                            )
                                        } else {
                                            Box(
                                                modifier = Modifier
                                                    .size(64.dp)
                                                    .clip(RoundedCornerShape(8.dp))
                                                    .background(Color(0xFFFEF3C7)),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Icon(Icons.Default.Build, contentDescription = null, tint = Color(0xFFD97706))
                                            }
                                        }

                                        Spacer(modifier = Modifier.width(12.dp))

                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = tool.name,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 14.sp
                                            )
                                            Text(
                                                text = tool.description,
                                                fontSize = 11.sp,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                maxLines = 2
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(10.dp))
                                    HorizontalDivider()
                                    Spacer(modifier = Modifier.height(10.dp))

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text(
                                                text = "${tool.pointsCost} pts",
                                                fontWeight = FontWeight.Black,
                                                fontSize = 16.sp,
                                                color = MaterialTheme.colorScheme.primary
                                            )
                                            Text(
                                                text = "₹${tool.rupeeValue.toInt()} equivalent",
                                                fontSize = 11.sp,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }

                                        val isAffordable = plumber.pointsBalance >= tool.pointsCost
                                        Button(
                                            onClick = { itemToRedeem = tool },
                                            enabled = canRedeem && isAffordable && !isSubmitting,
                                            shape = RoundedCornerShape(8.dp)
                                        ) {
                                            Text(
                                                text = if (isHindi) "यह औजार चुनें" else "Claim Tool",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // TAB 3: REDEMPTION HISTORY
            if (selectedTab == 3) {
                if (redemptionHistory.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            text = if (isHindi) "अभी तक कोई रिडेम्पशन अनुरोध नहीं किया गया है" else "No redemption requests yet",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 14.sp
                        )
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(redemptionHistory) { req ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                imageVector = when (req.method) {
                                                    "upi" -> Icons.Default.AccountBalance
                                                    "voucher" -> Icons.Default.CardGiftcard
                                                    else -> Icons.Default.Build
                                                },
                                                contentDescription = null,
                                                tint = MaterialTheme.colorScheme.primary,
                                                modifier = Modifier.size(18.dp)
                                            )
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text(
                                                text = when (req.method) {
                                                    "upi" -> "UPI Cash: ${req.upiId}"
                                                    "voucher" -> "Voucher: ${req.voucherDetails ?: "Gift Card"}"
                                                    else -> "Tool: ${req.toolDetails ?: "Equipment"}"
                                                },
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 13.sp
                                            )
                                        }

                                        // Status Chip
                                        val statusBg = when (req.status) {
                                            "paid" -> Color(0xFFD1FAE5)
                                            "dispatched" -> Color(0xFFDBEAFE)
                                            "rejected" -> Color(0xFFFEE2E2)
                                            else -> Color(0xFFFEF3C7)
                                        }
                                        val statusColor = when (req.status) {
                                            "paid" -> Color(0xFF065F46)
                                            "dispatched" -> Color(0xFF1E40AF)
                                            "rejected" -> Color(0xFF991B1B)
                                            else -> Color(0xFF92400E)
                                        }
                                        val statusText = when (req.status) {
                                            "paid" -> if (isHindi) "भुगतान पूर्ण" else "Paid"
                                            "dispatched" -> if (isHindi) "भेजा गया" else "Dispatched"
                                            "rejected" -> if (isHindi) "अस्वीकृत" else "Rejected"
                                            else -> if (isHindi) "विचाराधीन" else "Pending"
                                        }

                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(6.dp))
                                                .background(statusBg)
                                                .padding(horizontal = 8.dp, vertical = 4.dp)
                                        ) {
                                            Text(
                                                text = statusText,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = statusColor
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(6.dp))

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            text = "${req.points} pts (₹${req.rupeeValue.toInt()})",
                                            fontWeight = FontWeight.ExtraBold,
                                            color = MaterialTheme.colorScheme.primary,
                                            fontSize = 14.sp
                                        )
                                        Text(
                                            text = try {
                                                req.createdAt.take(10)
                                            } catch (e: Exception) { "" },
                                            fontSize = 11.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }

                                    if (!req.adminRemarks.isNullOrEmpty()) {
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Text(
                                            text = "Note: ${req.adminRemarks}",
                                            fontSize = 11.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
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

    // CONFIRMATION DIALOG: UPI
    if (showUpiConfirmDialog) {
        val pts = upiPointsInput.toLongOrNull() ?: 0L
        val rupees = (pts * generalSettings.rupeeValuePerPoint).toInt()

        AlertDialog(
            onDismissRequest = { showUpiConfirmDialog = false },
            title = { Text(if (isHindi) "UPI रिडेम्पशन की पुष्टि करें" else "Confirm UPI Redemption") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(text = if (isHindi) "UPI ID: $upiIdInput" else "UPI ID: $upiIdInput", fontWeight = FontWeight.Bold)
                    Text(text = if (isHindi) "काटे जाने वाले अंक: $pts अंक" else "Points to Deduct: $pts pts")
                    Text(text = if (isHindi) "खाते में आने वाली राशि: ₹$rupees" else "Amount to Receive: ₹$rupees", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        submitRedemptionRequest(
                            method = "upi",
                            points = pts,
                            rupeeValue = rupees.toDouble(),
                            upiId = upiIdInput
                        )
                    },
                    enabled = !isSubmitting
                ) {
                    Text(if (isHindi) "हाँ, सबमिट करें" else "Confirm & Submit")
                }
            },
            dismissButton = {
                TextButton(onClick = { showUpiConfirmDialog = false }) {
                    Text(if (isHindi) "रद्द करें" else "Cancel")
                }
            }
        )
    }

    // CONFIRMATION DIALOG: CATALOGUE ITEM (TOOL OR VOUCHER)
    if (itemToRedeem != null) {
        AlertDialog(
            onDismissRequest = { itemToRedeem = null },
            title = { Text(if (isHindi) "इनाम का दावा करें" else "Claim Reward") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(text = itemToRedeem!!.name, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Text(text = itemToRedeem!!.description, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = if (isHindi) "काटे जाने वाले अंक: ${itemToRedeem!!.pointsCost} अंक" else "Points Required: ${itemToRedeem!!.pointsCost} pts",
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(text = "Value: ₹${itemToRedeem!!.rupeeValue.toInt()}", fontSize = 12.sp)
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val item = itemToRedeem!!
                        submitRedemptionRequest(
                            method = item.category,
                            points = item.pointsCost,
                            rupeeValue = item.rupeeValue,
                            voucherDetails = if (item.category == "voucher") item.name else null,
                            toolDetails = if (item.category == "tool") item.name else null
                        )
                    },
                    enabled = !isSubmitting
                ) {
                    Text(if (isHindi) "हाँ, क्लेम करें" else "Confirm & Claim")
                }
            },
            dismissButton = {
                TextButton(onClick = { itemToRedeem = null }) {
                    Text(if (isHindi) "रद्द करें" else "Cancel")
                }
            }
        )
    }
}
