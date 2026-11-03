package com.shivagency.rewards.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Executive Heritage palette from the Stitch design export.
private val Alabaster = Color(0xFFFAF9F6)
private val Porcelain = Color(0xFFFFFFFF)
private val Obsidian = Color(0xFF1A1C1A)
private val AntiqueGold = Color(0xFF775A00)
private val Champagne = Color(0xFFC59B27)
private val Ecru = Color(0xFFF3F1EC)
private val SilkBorder = Color(0xFFE6E1D6)
private val Emerald = Color(0xFF006C4A)

private val EliteColors = lightColorScheme(
    primary = AntiqueGold,
    onPrimary = Porcelain,
    primaryContainer = Color(0xFFFFDF98),
    onPrimaryContainer = Color(0xFF473500),
    secondary = Color(0xFF565E74),
    onSecondary = Porcelain,
    secondaryContainer = Color(0xFFDAE2FD),
    onSecondaryContainer = Color(0xFF3F465C),
    tertiary = Emerald,
    onTertiary = Porcelain,
    tertiaryContainer = Color(0xFF85F8C4),
    onTertiaryContainer = Color(0xFF00402A),
    error = Color(0xFFBA1A1A),
    onError = Porcelain,
    errorContainer = Color(0xFFFFDAD6),
    onErrorContainer = Color(0xFF93000A),
    background = Alabaster,
    onBackground = Obsidian,
    surface = Porcelain,
    onSurface = Obsidian,
    surfaceVariant = Ecru,
    onSurfaceVariant = Color(0xFF4E4635),
    outline = Color(0xFF807663),
    outlineVariant = SilkBorder,
    inverseSurface = Color(0xFF2F312F),
    inverseOnSurface = Color(0xFFF2F1EE),
    inversePrimary = Color(0xFFEEC14B),
    surfaceTint = AntiqueGold
)

private val EliteTypography = Typography(
    displayLarge = TextStyle(fontFamily = FontFamily.Serif, fontWeight = FontWeight.SemiBold, fontSize = 40.sp, lineHeight = 48.sp, letterSpacing = (-0.8).sp),
    displayMedium = TextStyle(fontFamily = FontFamily.Serif, fontWeight = FontWeight.SemiBold, fontSize = 34.sp, lineHeight = 42.sp),
    displaySmall = TextStyle(fontFamily = FontFamily.Serif, fontWeight = FontWeight.SemiBold, fontSize = 30.sp, lineHeight = 36.sp),
    headlineLarge = TextStyle(fontFamily = FontFamily.Serif, fontWeight = FontWeight.SemiBold, fontSize = 28.sp, lineHeight = 36.sp),
    headlineMedium = TextStyle(fontFamily = FontFamily.Serif, fontWeight = FontWeight.SemiBold, fontSize = 22.sp, lineHeight = 28.sp),
    headlineSmall = TextStyle(fontFamily = FontFamily.Serif, fontWeight = FontWeight.SemiBold, fontSize = 18.sp, lineHeight = 24.sp),
    titleLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 22.sp, lineHeight = 28.sp),
    titleMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 24.sp),
    titleSmall = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 20.sp)
)

@Composable
fun ShivAgencyTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = EliteColors,
        typography = EliteTypography,
        content = content
    )
}
