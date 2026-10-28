package com.shivagency.rewards.ui.screens.leaderboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.firestore.FirebaseFirestore
import com.shivagency.rewards.data.model.GeneralSettings
import com.shivagency.rewards.data.model.Plumber
import java.text.SimpleDateFormat
import java.util.*

data class PlumberRankItem(
    val id: String,
    val name: String,
    val plumberCode: String,
    val pointsThisMonth: Long,
    val lifetimeEarned: Long
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeaderboardScreen(
    currentPlumber: Plumber,
    isHindi: Boolean,
    onBack: () -> Unit
) {
    val firestore = remember { FirebaseFirestore.getInstance() }
    var rankings by remember { mutableStateOf<List<PlumberRankItem>>(emptyList()) }
    var generalSettings by remember { mutableStateOf(GeneralSettings()) }
    var isLoading by remember { mutableStateOf(true) }

    val currentMonthName = remember {
        SimpleDateFormat("MMMM yyyy", Locale.getDefault()).format(Date())
    }

    LaunchedEffect(Unit) {
        isLoading = true
        // 1. Load Settings
        firestore.collection("appSettings").document("general")
            .get()
            .addOnSuccessListener { doc ->
                if (doc.exists()) {
                    generalSettings = doc.toObject(GeneralSettings::class.java) ?: GeneralSettings()
                }
            }

        // 2. Query transactions for the current month to calculate monthly points
        val calendar = Calendar.getInstance()
        calendar.set(Calendar.DAY_OF_MONTH, 1)
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        val startOfMonthIso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(calendar.time)

        // Fetch plumbers first
        firestore.collection("plumbers").get()
            .addOnSuccessListener { plumbersSnap ->
                val plumberMap = mutableMapOf<String, Plumber>()
                for (d in plumbersSnap.documents) {
                    val p = d.toObject(Plumber::class.java)
                    if (p != null) plumberMap[d.id] = p.copy(id = d.id)
                }

                // Fetch monthly transactions
                firestore.collection("transactions")
                    .whereGreaterThanOrEqualTo("createdAt", startOfMonthIso)
                    .get()
                    .addOnSuccessListener { txSnap ->
                        val monthlyPoints = mutableMapOf<String, Long>()
                        for (d in txSnap.documents) {
                            val plumberId = d.getString("plumberId") ?: ""
                            val pts = d.getLong("points") ?: 0L
                            if (pts > 0 && plumberId.isNotEmpty()) {
                                monthlyPoints[plumberId] = (monthlyPoints[plumberId] ?: 0L) + pts
                            }
                        }

                        val list = mutableListOf<PlumberRankItem>()
                        for ((id, p) in plumberMap) {
                            val pts = monthlyPoints[id] ?: (p.pointsBalance.coerceAtMost(p.lifetimeEarned))
                            list.add(
                                PlumberRankItem(
                                    id = id,
                                    name = p.name,
                                    plumberCode = p.plumberCode,
                                    pointsThisMonth = pts,
                                    lifetimeEarned = p.lifetimeEarned
                                )
                            )
                        }

                        // Sort descending by monthly points
                        list.sortByDescending { it.pointsThisMonth }
                        rankings = list
                        isLoading = false
                    }
                    .addOnFailureListener {
                        // Fallback: rank by lifetime / current points if transaction query index is pending
                        val fallbackList = plumberMap.values.map { p ->
                            PlumberRankItem(
                                id = p.id,
                                name = p.name,
                                plumberCode = p.plumberCode,
                                pointsThisMonth = p.pointsBalance,
                                lifetimeEarned = p.lifetimeEarned
                            )
                        }.sortedByDescending { it.pointsThisMonth }
                        rankings = fallbackList
                        isLoading = false
                    }
            }
            .addOnFailureListener {
                isLoading = false
            }
    }

    val userRankIndex = rankings.indexOfFirst { it.id == currentPlumber.id }
    val userRank = if (userRankIndex >= 0) userRankIndex + 1 else "-"
    val top1 = rankings.getOrNull(0)
    val top2 = rankings.getOrNull(1)
    val top3 = rankings.getOrNull(2)

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = if (isHindi) "मासिक चैंपियन लीडरबोर्ड" else "Monthly Plumber Champions",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                        Text(
                            text = currentMonthName,
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
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Shop Reward Banner
            if (!generalSettings.leaderboardRewardText.isNullOrBlank()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFF59E0B)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.EmojiEvents,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = if (isHindi) "दुकान मालिक विशेष पुरस्कार" else "Shop Owner Monthly Prize",
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF92400E),
                                    fontSize = 13.sp
                                )
                                Text(
                                    text = generalSettings.leaderboardRewardText,
                                    color = Color(0xFFB45309),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }
            }

            // Top 3 Podium
            if (rankings.isNotEmpty()) {
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
                                modifier = Modifier.fillMaxWidth(),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = if (isHindi) "इस माह के शीर्ष 3 ठेकेदार" else "Top 3 Contractors This Month",
                                    color = Color(0xFF94A3B8),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )

                                Spacer(modifier = Modifier.height(16.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceEvenly,
                                    verticalAlignment = Alignment.Bottom
                                ) {
                                    // Rank 2 (Silver)
                                    PodiumPillar(
                                        rank = 2,
                                        name = top2?.name ?: "-",
                                        points = top2?.pointsThisMonth ?: 0L,
                                        badgeColor = Color(0xFFCBD5E1),
                                        height = 100.dp
                                    )

                                    // Rank 1 (Gold - Taller in Center)
                                    PodiumPillar(
                                        rank = 1,
                                        name = top1?.name ?: "-",
                                        points = top1?.pointsThisMonth ?: 0L,
                                        badgeColor = Color(0xFFFBBF24),
                                        height = 130.dp
                                    )

                                    // Rank 3 (Bronze)
                                    PodiumPillar(
                                        rank = 3,
                                        name = top3?.name ?: "-",
                                        points = top3?.pointsThisMonth ?: 0L,
                                        badgeColor = Color(0xFFD97706),
                                        height = 80.dp
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Logged-in User Current Rank Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.primary),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "#$userRank",
                                    color = Color.White,
                                    fontWeight = FontWeight.Black,
                                    fontSize = 14.sp
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = if (isHindi) "आपकी वर्तमान स्थिति" else "Your Current Rank",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp
                                )
                                Text(
                                    text = "${currentPlumber.name} (${currentPlumber.plumberCode})",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                                )
                            }
                        }

                        Text(
                            text = "${currentPlumber.pointsBalance} pts",
                            fontWeight = FontWeight.Black,
                            fontSize = 16.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }

            // All Plumbers Ranking Header
            item {
                Text(
                    text = if (isHindi) "सम्पूर्ण मासिक रैंकिंग" else "Full Monthly Leaderboard",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }

            // Plumbers List
            itemsIndexed(rankings) { index, item ->
                val rank = index + 1
                val isMe = item.id == currentPlumber.id

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isMe) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)
                        else MaterialTheme.colorScheme.surface
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            // Rank Number / Badge
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .background(
                                        when (rank) {
                                            1 -> Color(0xFFFBBF24)
                                            2 -> Color(0xFF94A3B8)
                                            3 -> Color(0xFFD97706)
                                            else -> Color(0xFFF1F5F9)
                                        }
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "$rank",
                                    fontWeight = FontWeight.Black,
                                    fontSize = 12.sp,
                                    color = if (rank <= 3) Color.White else Color(0xFF475569)
                                )
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = item.name,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp
                                    )
                                    if (isMe) {
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Surface(
                                            color = MaterialTheme.colorScheme.primary,
                                            shape = RoundedCornerShape(4.dp)
                                        ) {
                                            Text(
                                                text = if (isHindi) "आप" else "You",
                                                color = Color.White,
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                            )
                                        }
                                    }
                                }
                                Text(
                                    text = item.plumberCode,
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        Text(
                            text = "+${item.pointsThisMonth} pts",
                            fontWeight = FontWeight.Black,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun PodiumPillar(
    rank: Int,
    name: String,
    points: Long,
    badgeColor: Color,
    height: androidx.compose.ui.unit.Dp
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.width(90.dp)
    ) {
        // Medal / Trophy Icon
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(badgeColor),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "$rank",
                color = Color.Black,
                fontWeight = FontWeight.Black,
                fontSize = 15.sp
            )
        }

        Spacer(modifier = Modifier.height(6.dp))

        Text(
            text = name,
            color = Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = 11.sp,
            maxLines = 1
        )

        Text(
            text = "$points pts",
            color = Color(0xFF38BDF8),
            fontWeight = FontWeight.ExtraBold,
            fontSize = 11.sp
        )

        Spacer(modifier = Modifier.height(6.dp))

        // Pillar block
        Box(
            modifier = Modifier
                .width(70.dp)
                .height(height)
                .clip(RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp))
                .background(Color.White.copy(alpha = 0.12f))
        )
    }
}
