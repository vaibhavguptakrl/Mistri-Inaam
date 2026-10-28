package com.shivagency.rewards.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

enum class AppColorTheme {
    BLUE,
    RED,
    CHARCOAL_ORANGE
}

@Composable
fun ShivAgencyTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    colorTheme: AppColorTheme = AppColorTheme.BLUE,
    content: @Composable () -> Unit
) {
    val colorScheme = when (colorTheme) {
        AppColorTheme.BLUE -> {
            if (darkTheme) {
                darkColorScheme(
                    primary = BlueSecondary,
                    secondary = BlueAccent,
                    background = Slate900,
                    surface = Slate800,
                    onPrimary = Color.White,
                    onBackground = Slate50,
                    onSurface = Slate50
                )
            } else {
                lightColorScheme(
                    primary = BluePrimary,
                    secondary = BlueSecondary,
                    tertiary = BlueAccent,
                    background = Slate50,
                    surface = Color.White,
                    onPrimary = Color.White,
                    onBackground = Slate900,
                    onSurface = Slate900
                )
            }
        }
        AppColorTheme.RED -> {
            if (darkTheme) {
                darkColorScheme(
                    primary = RedSecondary,
                    secondary = RedAccent,
                    background = Slate900,
                    surface = Slate800,
                    onPrimary = Color.White,
                    onBackground = Slate50,
                    onSurface = Slate50
                )
            } else {
                lightColorScheme(
                    primary = RedPrimary,
                    secondary = RedSecondary,
                    tertiary = RedAccent,
                    background = Slate50,
                    surface = Color.White,
                    onPrimary = Color.White,
                    onBackground = Slate900,
                    onSurface = Slate900
                )
            }
        }
        AppColorTheme.CHARCOAL_ORANGE -> {
            if (darkTheme) {
                darkColorScheme(
                    primary = OrangeAccent,
                    secondary = CharcoalSecondary,
                    background = Color.Black,
                    surface = CharcoalPrimary,
                    onPrimary = Color.Black,
                    onBackground = Slate50,
                    onSurface = Slate50
                )
            } else {
                lightColorScheme(
                    primary = CharcoalPrimary,
                    secondary = OrangeAccent,
                    tertiary = OrangeAccent,
                    background = Slate50,
                    surface = Color.White,
                    onPrimary = Color.White,
                    onBackground = Slate900,
                    onSurface = Slate900
                )
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
