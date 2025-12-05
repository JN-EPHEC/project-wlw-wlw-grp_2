import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';

const MOCK_ITEMS = [
  { id: '1', title: 'Paris' },
  { id: '2', title: 'Bruxelles' },
  { id: '3', title: 'Lyon' },
  { id: '4', title: 'Marseille' },
  { id: '5', title: 'Anvers' },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_ITEMS;
    return MOCK_ITEMS.filter((it) => it.title.toLowerCase().includes(q));
  }, [query]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Recherche</ThemedText>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher une ville..."
        style={styles.input}
        placeholderTextColor="#6b7280"
      />

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.item}>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
            </View>
            <Link href="/">
              <Link.Trigger>
                <ThemedText type="link">Voir</ThemedText>
              </Link.Trigger>
            </Link>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  input: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  sep: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
});
