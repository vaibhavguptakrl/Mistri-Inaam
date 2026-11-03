package com.shivagency.rewards.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

enum class EliteTab { HOME, PASSBOOK, REWARDS, PROFILE }

@Composable
fun EliteBottomBar(
    selected: EliteTab,
    isHindi: Boolean,
    onSelect: (EliteTab) -> Unit
) {
    val items = listOf(
        Triple(EliteTab.HOME, Icons.Default.Home, if (isHindi) "होम" else "Home"),
        Triple(EliteTab.PASSBOOK, Icons.Default.ReceiptLong, if (isHindi) "पासबुक" else "Passbook"),
        Triple(EliteTab.REWARDS, Icons.Default.CardGiftcard, if (isHindi) "इनाम पाएं" else "Rewards"),
        Triple(EliteTab.PROFILE, Icons.Default.Person, if (isHindi) "प्रोफ़ाइल" else "Profile")
    )
    Column(Modifier.fillMaxWidth().background(Color.White)) {
        androidx.compose.material3.HorizontalDivider(color = Color(0xFFE6E1D6), thickness = 0.7.dp)
        NavigationBar(
            modifier = Modifier.fillMaxWidth().height(64.dp),
            containerColor = Color.White,
            tonalElevation = 0.dp
        ) {
            items.forEach { (tab, icon, label) ->
                val active = selected == tab
                NavigationBarItem(
                    selected = active,
                    onClick = { onSelect(tab) },
                    icon = { Icon(icon, contentDescription = label, modifier = Modifier.padding(bottom = 1.dp)) },
                    label = { Text(label, fontSize = 10.sp, fontWeight = if (active) FontWeight.Bold else FontWeight.Medium) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        selectedTextColor = MaterialTheme.colorScheme.primary,
                        indicatorColor = Color(0xFFFFF5DA),
                        unselectedIconColor = Color(0xFF565E74),
                        unselectedTextColor = Color(0xFF565E74)
                    )
                )
            }
        }
    }
}
