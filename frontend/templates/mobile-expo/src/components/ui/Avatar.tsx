import { Image, Text, View } from 'react-native'
import { useTheme } from '@/providers/ThemeProvider'

/** A round picture, or the person's initials when there is no picture. */
export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  const { colors } = useTheme()
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  if (src)
    return (
      <Image
        source={{ uri: src }}
        accessibilityLabel={name}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    )
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  )
}
