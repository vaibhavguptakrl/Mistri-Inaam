package com.shivagency.ludo

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Casino
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.random.Random

private val colors = listOf(Color(0xFFE84D4D), Color(0xFF31A66A), Color(0xFFFFC247), Color(0xFF4785E8))
private val names = listOf("Red", "Green", "Yellow", "Blue")
private val path = listOf(
    6 to 1, 6 to 2, 6 to 3, 6 to 4, 6 to 5, 5 to 6, 4 to 6, 3 to 6, 2 to 6, 1 to 6,
    0 to 6, 0 to 7, 0 to 8, 1 to 8, 2 to 8, 3 to 8, 4 to 8, 5 to 8, 6 to 9, 6 to 10,
    6 to 11, 6 to 12, 6 to 13, 6 to 14, 7 to 14, 8 to 14, 8 to 13, 8 to 12, 8 to 11,
    8 to 10, 8 to 9, 9 to 8, 10 to 8, 11 to 8, 12 to 8, 13 to 8, 14 to 8, 14 to 7,
    14 to 6, 13 to 6, 12 to 6, 11 to 6, 10 to 6, 9 to 6, 8 to 5, 8 to 4, 8 to 3,
    8 to 2, 8 to 1, 8 to 0, 7 to 0, 6 to 0
)
private val starts = listOf(0, 39, 13, 26)
private val safe = setOf(0, 8, 13, 21, 26, 34, 39, 47)
private data class Pawn(val progress: Int = -1)
private data class Player(val name: String, val colorIndex: Int, val pawns: List<Pawn> = List(4) { Pawn() })

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme(colorScheme = lightColorScheme(primary = Color(0xFF254E70), background = Color(0xFFF4F6F8))) { LudoApp() } }
    }
}

@Composable
private fun LudoApp() {
    val prefs = androidx.compose.ui.platform.LocalContext.current.getSharedPreferences("ludo_points", 0)
    var playerCount by remember { mutableIntStateOf(2) }
    var players by remember { mutableStateOf(listOf(Player("Player 1", 0), Player("Player 2", 2))) }
    var turn by remember { mutableIntStateOf(0) }
    var dice by remember { mutableIntStateOf(0) }
    var winner by remember { mutableIntStateOf(-1) }
    var chosen by remember { mutableIntStateOf(-1) }
    var rolling by remember { mutableStateOf(false) }
    var scores by remember { mutableStateOf((0..3).map { prefs.getInt("score_$it", 0) }) }
    val current = players.getOrNull(turn)
    val valid = current?.pawns?.mapIndexedNotNull { i, p -> if ((dice == 6 && p.progress == -1) || (p.progress in 0..56 && p.progress + dice <= 57)) i else null }.orEmpty()

    fun startGame(count: Int) {
        playerCount = count
        val active = when (count) { 2 -> listOf(0, 2); 3 -> listOf(0, 1, 2); else -> listOf(0, 1, 2, 3) }
        players = active.mapIndexed { idx, ci -> Player("Player ${idx + 1}", ci) }
        turn = 0; dice = 0; winner = -1; chosen = -1
    }
    fun movePawn(pawnIndex: Int) {
        if (winner >= 0 || pawnIndex !in valid) return
        val p = current ?: return
        val old = p.pawns[pawnIndex].progress
        val next = if (old == -1) 0 else old + dice
        val updatedPawns = p.pawns.toMutableList().also { it[pawnIndex] = Pawn(next) }
        val nextPlayers = players.toMutableList().also { it[turn] = p.copy(pawns = updatedPawns) }
        if (next in 0..51) {
            val landing = (starts[p.colorIndex] + next) % 52
            if (landing !in safe) nextPlayers.indices.filter { it != turn }.forEach { other ->
                val op = nextPlayers[other]
                val reset = op.pawns.map { pawn ->
                    if (pawn.progress in 0..51 && (starts[op.colorIndex] + pawn.progress) % 52 == landing) Pawn() else pawn
                }
                nextPlayers[other] = op.copy(pawns = reset)
            }
        }
        players = nextPlayers
        val didWin = updatedPawns.all { it.progress == 57 }
        if (didWin) {
            winner = turn
            val ci = p.colorIndex
            scores = scores.toMutableList().also { it[ci] += 10 }
            prefs.edit().putInt("score_$ci", scores[ci]).apply()
        } else {
            if (dice != 6) turn = (turn + 1) % players.size
            dice = 0; chosen = -1
        }
    }

    Column(Modifier.fillMaxSize().background(Color(0xFFF4F6F8)).padding(horizontal = 16.dp, vertical = 10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            Column {
                Text("LUDO", fontSize = 28.sp, fontWeight = FontWeight.Black, color = Color(0xFF17324D), letterSpacing = 2.sp)
                Text("Play together. Win points.", fontSize = 13.sp, color = Color(0xFF667789))
            }
            Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp) {
                Row(Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("⭐ ", fontSize = 16.sp); Text("${scores.sum()} pts", fontWeight = FontWeight.Bold, color = Color(0xFF17324D))
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("PLAYERS", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF748294), letterSpacing = 1.sp)
            (2..4).forEach { count ->
                FilterChip(selected = playerCount == count, onClick = { startGame(count) }, label = { Text("$count") })
            }
            Spacer(Modifier.weight(1f))
            IconButton(onClick = { startGame(playerCount) }) { Icon(Icons.Default.Refresh, "New game") }
        }
        Spacer(Modifier.height(4.dp))
        Board(players, turn, chosen, Modifier.fillMaxWidth().weight(1f).aspectRatio(1f).clip(RoundedCornerShape(16.dp)).background(Color.White))
        Spacer(Modifier.height(10.dp))
        if (winner >= 0) {
            Surface(color = Color(0xFFE4F4EA), shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Text("🏆  ${players[winner].name} wins!  +10 points", Modifier.padding(14.dp), color = Color(0xFF196B42), fontWeight = FontWeight.Bold)
            }
        } else if (current != null) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("${current.name}'s turn", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = colors[current.colorIndex])
                    Text(if (dice == 0) "Roll the dice" else if (valid.isEmpty()) "No move. Turn passes." else "Choose a token to move", fontSize = 12.sp, color = Color(0xFF667789))
                }
                Button(onClick = {
                    if (dice != 0 || rolling || winner >= 0) return@Button
                    rolling = true
                    dice = Random.nextInt(1, 7)
                    rolling = false
                    if (valid.isEmpty()) { if (dice != 6) turn = (turn + 1) % players.size; dice = 0 }
                }, enabled = dice == 0 && winner < 0, shape = RoundedCornerShape(14.dp), contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp)) {
                    Icon(Icons.Default.Casino, null); Spacer(Modifier.width(6.dp)); Text(if (dice == 0) "ROLL" else "$dice")
                }
            }
            if (dice > 0 && valid.isNotEmpty()) {
                Spacer(Modifier.height(5.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(7.dp), modifier = Modifier.fillMaxWidth()) {
                    valid.forEach { id ->
                        OutlinedButton(onClick = { chosen = id; movePawn(id) }, modifier = Modifier.weight(1f), contentPadding = PaddingValues(6.dp)) { Text("Token ${id + 1}", fontSize = 11.sp) }
                    }
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            players.forEach { p ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(9.dp).clip(CircleShape).background(colors[p.colorIndex]))
                    Spacer(Modifier.width(4.dp)); Text("${scores[p.colorIndex]}", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
        Spacer(Modifier.height(2.dp))
        Text("Pass-and-play • Fair random dice • Points stay on this device", fontSize = 10.sp, color = Color(0xFF83909D), modifier = Modifier.align(Alignment.CenterHorizontally))
    }
}

@Composable
private fun Board(players: List<Player>, turn: Int, chosen: Int, modifier: Modifier = Modifier) {
    Canvas(modifier) {
        val cell = size.minDimension / 15f
        fun rect(x: Int, y: Int, w: Int, h: Int, color: Color) = drawRect(color, androidx.compose.ui.geometry.Offset(x * cell, y * cell), androidx.compose.ui.geometry.Size(w * cell, h * cell))
        rect(0,0,6,6,Color(0xFFFFE8E6)); rect(9,0,6,6,Color(0xFFE4F4EA)); rect(0,9,6,6,Color(0xFFFFF4D9)); rect(9,9,6,6,Color(0xFFE6EEFC))
        // Home yards
        listOf(Triple(1,1,colors[0]), Triple(10,1,colors[1]), Triple(1,10,colors[2]), Triple(10,10,colors[3])).forEach { (x,y,c) ->
            drawRect(Color.White, androidx.compose.ui.geometry.Offset(x*cell,y*cell), androidx.compose.ui.geometry.Size(4*cell,4*cell))
            for (i in 0..1) for (j in 0..1) drawCircle(c, radius = cell*.25f, center = androidx.compose.ui.geometry.Offset((x+1.2f+j*1.6f)*cell,(y+1.2f+i*1.6f)*cell))
        }
        path.forEachIndexed { i, (x,y) ->
            val owner = starts.indexOf(i)
            val fill = if (owner >= 0) colors[owner] else if (i in safe) Color(0xFFEAF0F5) else Color.White
            drawRect(fill, androidx.compose.ui.geometry.Offset(x*cell,y*cell), androidx.compose.ui.geometry.Size(cell,cell))
            drawRect(Color(0xFFD8E0E7), androidx.compose.ui.geometry.Offset(x*cell,y*cell), androidx.compose.ui.geometry.Size(cell,cell), style = Stroke(1f))
        }
        val lanes = listOf((1..5).map { 7 to it }, (1..5).map { (14-it) to 7 }, (1..5).map { 7 to (14-it) }, (1..5).map { it to 7 })
        lanes.forEachIndexed { idx, lane -> lane.forEach { (x,y) -> drawRect(colors[idx].copy(alpha=.65f), androidx.compose.ui.geometry.Offset(x*cell,y*cell), androidx.compose.ui.geometry.Size(cell,cell)) } }
        val center = Path().apply { moveTo(6*cell,6*cell); lineTo(9*cell,6*cell); lineTo(7.5f*cell,7.5f*cell); close() }
        drawPath(center, colors[1])
        val center2 = Path().apply { moveTo(9*cell,6*cell); lineTo(9*cell,9*cell); lineTo(7.5f*cell,7.5f*cell); close() }; drawPath(center2, colors[3])
        val center3 = Path().apply { moveTo(9*cell,9*cell); lineTo(6*cell,9*cell); lineTo(7.5f*cell,7.5f*cell); close() }; drawPath(center3, colors[2])
        val center4 = Path().apply { moveTo(6*cell,9*cell); lineTo(6*cell,6*cell); lineTo(7.5f*cell,7.5f*cell); close() }; drawPath(center4, colors[0])
        players.forEach { p ->
            p.pawns.forEachIndexed { pi, pawn ->
                val (x,y) = when {
                    pawn.progress == -1 -> {
                        val bx = if (p.colorIndex == 0 || p.colorIndex == 2) 1 else 10
                        val by = if (p.colorIndex == 0 || p.colorIndex == 1) 1 else 10
                        (bx + 1.2f + (pi%2)*1.6f) to (by + 1.2f + (pi/2)*1.6f)
                    }
                    pawn.progress <= 51 -> { val pos = path[(starts[p.colorIndex]+pawn.progress)%52]; (pos.first+.5f) to (pos.second+.5f) }
                    pawn.progress < 57 -> { val lane = lanes[p.colorIndex][pawn.progress-52]; (lane.first+.5f) to (lane.second+.5f) }
                    else -> 7.5f to 7.5f
                }
                val c = colors[p.colorIndex]
                drawCircle(Color.White, cell*.34f, androidx.compose.ui.geometry.Offset(x*cell,y*cell))
                drawCircle(c, cell*.27f, androidx.compose.ui.geometry.Offset(x*cell,y*cell))
                drawCircle(Color.White, cell*.07f, androidx.compose.ui.geometry.Offset(x*cell,y*cell))
            }
        }
    }
}
