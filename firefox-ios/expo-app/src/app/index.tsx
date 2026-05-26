import { useSharedState, sendMessage, addMessageListener } from 'expo-brownfield';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

interface Bookmark {
  id: number;
  title: string;
  url: string;
  domain: string;
  visited: boolean;
}

const FIREFOX_ORANGE = '#FF7139';

export default function BookmarksInspector() {
  const scheme = useColorScheme();
  const cardBg = scheme === 'dark' ? '#1C1C1E' : '#F2F2F7';
  const subtle = scheme === 'dark' ? '#3A3A3C' : '#E5E5EA';
  const muted = scheme === 'dark' ? '#8E8E93' : '#6E6E73';

  const [bookmarks] = useSharedState<Bookmark[]>('bookmarks', []);
  const [historyCount] = useSharedState<number>('historyCount', 0);
  const [openTabCount] = useSharedState<number>('openTabCount', 0);
  const [syncStatus] = useSharedState<string>('syncStatus', 'Idle');
  const [lastSyncedAt] = useSharedState<string>('lastSyncedAt', '');

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const sub = addMessageListener((msg) => {
      if (msg.type === 'BOOKMARK_OPENED') {
        setToast(`Opened "${msg.title}" in a new tab`);
      } else if (msg.type === 'SYNC_FINISHED') {
        setToast('Sync finished');
      }
      setTimeout(() => setToast(null), 2500);
    });
    return () => sub.remove();
  }, []);

  const unvisited = (bookmarks ?? []).filter((b) => !b.visited).length;
  const total = (bookmarks ?? []).length;
  const time = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={[styles.flame, { backgroundColor: FIREFOX_ORANGE }]}>
              <ThemedText style={styles.flameGlyph}>🦊</ThemedText>
            </View>
            <ThemedText type="title" style={styles.title}>
              Bookmarks
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: muted }]}>
              Rendered by React Native inside Firefox iOS
            </ThemedText>
          </View>

          <View style={styles.statsRow}>
            <Stat label="Bookmarks" value={String(total)} bg={cardBg} />
            <Stat label="History" value={String(historyCount ?? 0)} bg={cardBg} />
            <Stat label="Tabs" value={String(openTabCount ?? 0)} bg={cardBg} />
          </View>

          <View style={[styles.syncRow, { backgroundColor: cardBg }]}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.syncTitle}>Sync</ThemedText>
              <ThemedText style={[styles.syncSubtitle, { color: muted }]}>
                {syncStatus ?? 'Idle'} · last synced {time}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => sendMessage({ type: 'SYNC_NOW' })}
              style={({ pressed }) => [
                styles.syncBtn,
                { backgroundColor: FIREFOX_ORANGE, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <ThemedText style={styles.syncBtnText}>Sync now</ThemedText>
            </Pressable>
          </View>

          <ThemedText style={[styles.section, { color: muted }]}>
            {unvisited} unvisited · tap to open in Firefox
          </ThemedText>

          <View style={[styles.list, { backgroundColor: cardBg }]}>
            {(bookmarks ?? []).map((b, idx) => (
              <Pressable
                key={b.id}
                onPress={() =>
                  sendMessage({ type: 'OPEN_BOOKMARK', id: b.id, url: b.url })
                }
                style={({ pressed }) => [
                  styles.row,
                  idx < (bookmarks?.length ?? 0) - 1 && {
                    borderBottomColor: subtle,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <View
                  style={[
                    styles.favicon,
                    { backgroundColor: faviconColor(b.domain) },
                  ]}
                >
                  <ThemedText style={styles.faviconText}>
                    {b.domain.charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={[styles.rowTitle, b.visited && { color: muted }]}
                    numberOfLines={1}
                  >
                    {b.title}
                  </ThemedText>
                  <ThemedText
                    style={[styles.rowDomain, { color: muted }]}
                    numberOfLines={1}
                  >
                    {b.domain}
                  </ThemedText>
                </View>
                {!b.visited && (
                  <View style={[styles.dot, { backgroundColor: FIREFOX_ORANGE }]} />
                )}
              </Pressable>
            ))}
          </View>

          {toast && (
            <View style={[styles.toast, { backgroundColor: FIREFOX_ORANGE }]}>
              <ThemedText style={styles.toastText}>{toast}</ThemedText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Stat({
  label,
  value,
  bg,
}: {
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <View style={[styles.stat, { backgroundColor: bg }]}>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
  );
}

function faviconColor(domain: string): string {
  const map: Record<string, string> = {
    'mozilla.org': '#FF7139',
    'developer.mozilla.org': '#005A9C',
    'github.com': '#24292E',
    'news.ycombinator.com': '#FF6600',
    'wikipedia.org': '#202122',
    'reddit.com': '#FF4500',
  };
  return map[domain] ?? '#5E5CE6';
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: Spacing.three, gap: Spacing.three },
  hero: { alignItems: 'center', paddingTop: Spacing.three, gap: 8 },
  flame: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameGlyph: { fontSize: 36 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 13, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: Spacing.two },
  stat: {
    flex: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: 12,
    gap: Spacing.two,
  },
  syncTitle: { fontSize: 15, fontWeight: '600' },
  syncSubtitle: { fontSize: 12, marginTop: 2 },
  syncBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  section: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  list: { borderRadius: 12, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two,
    gap: Spacing.two,
  },
  favicon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faviconText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rowTitle: { fontSize: 15, fontWeight: '500' },
  rowDomain: { fontSize: 12, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  toast: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  toastText: { color: '#fff', fontWeight: '600' },
});
