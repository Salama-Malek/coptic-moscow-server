import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Mic } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { useTheme } from '../theme/ThemeProvider';
import { getFontFamily, type Language } from '../theme/fonts';

// Inline audio player for a voice message attached to an announcement.
// Lightweight — one sound per player instance, unloads on unmount or when
// the URL prop changes. No global playback queue; if the user taps multiple
// cards, the previous one keeps playing until it ends or they scrub elsewhere.

interface Props {
  url: string;
  durationMs?: number | null;
}

export default function VoicePlayer({ url, durationMs }: Props) {
  const { i18n } = useTranslation();
  const { theme } = useTheme();
  const lang = (i18n.language as Language) || 'ar';
  const fonts = getFontFamily(lang);

  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationKnown, setDurationKnown] = useState<number | null>(durationMs ?? null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      // Unload when the component unmounts (card scrolls off-screen, inbox refreshes, etc.)
      soundRef.current?.unloadAsync().catch(() => undefined);
      soundRef.current = null;
    };
  }, []);

  // If the URL changes (edit-after-send with a new recording), reload the sound.
  useEffect(() => {
    const currentSound = soundRef.current;
    soundRef.current = null;
    setPlaying(false);
    setPositionMs(0);
    currentSound?.unloadAsync().catch(() => undefined);
  }, [url]);

  const togglePlay = async (): Promise<void> => {
    try {
      if (!soundRef.current) {
        setLoading(true);
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true },
          (status) => {
            if (!status.isLoaded) return;
            setPositionMs(status.positionMillis);
            if (status.durationMillis && !durationKnown) {
              setDurationKnown(status.durationMillis);
            }
            setPlaying(status.isPlaying);
            if (status.didJustFinish) {
              setPlaying(false);
              setPositionMs(0);
              sound.setPositionAsync(0).catch(() => undefined);
            }
          },
        );
        soundRef.current = sound;
        setLoading(false);
        return;
      }
      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) return;
      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch (err) {
      console.warn('[VoicePlayer] play failed', err);
      setLoading(false);
      setPlaying(false);
    }
  };

  const total = durationKnown || 0;
  const progressPct = total > 0 ? Math.min(100, (positionMs / total) * 100) : 0;

  return (
    <Pressable onPress={togglePlay} accessibilityRole="button" style={styles.container}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: theme.colors.gold + '33', borderColor: theme.colors.gold },
        ]}
      >
        {playing ? (
          <Pause size={18} color={theme.colors.primary} strokeWidth={1.75} />
        ) : loading ? (
          <Mic size={18} color={theme.colors.primary} strokeWidth={1.75} />
        ) : (
          <Play size={18} color={theme.colors.primary} strokeWidth={1.75} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <View
          style={[
            styles.progressTrack,
            { backgroundColor: theme.colors.border },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              { width: `${progressPct}%`, backgroundColor: theme.colors.gold },
            ]}
          />
        </View>
        <Text
          style={[
            styles.durationText,
            { color: theme.colors.inkMuted, fontFamily: fonts.body },
          ]}
        >
          {formatMs(positionMs)} / {formatMs(total)}
        </Text>
      </View>
    </Pressable>
  );
}

function formatMs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  durationText: {
    marginTop: 4,
    fontSize: 11,
  },
});
