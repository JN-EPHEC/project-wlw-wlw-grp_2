import { Link } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function Index() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Accueil</ThemedText>

      <ThemedText style={styles.lead}>
        Bienvenue dans l'application. Cette page d'accueil utilise les composants thémés
        du projet pour rester cohérente avec le style.
      </ThemedText>

      <ThemedText style={styles.paragraph}>
        Pour commencer :
      </ThemedText>

      <Link href="/(tabs)">
        <Link.Trigger>
          <ThemedText type="link">Aller à l'exploration</ThemedText>
        </Link.Trigger>
        <Link.Preview />
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
    justifyContent: 'center',
  },
  lead: {
    fontSize: 18,
  },
  paragraph: {
    marginTop: 8,
  },
});
