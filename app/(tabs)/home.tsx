import React from 'react';
import { StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Image } from 'expo-image';

export default function HomeFr() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Bienvenue sur l'application</ThemedText>
        <ThemedText style={styles.lead}>
          Ceci est la page d'accueil. Vous pouvez personnaliser cette page pour expliquer
          l'objectif de votre application, ajouter des boutons d'appel à l'action, ou afficher
          du contenu important pour vos utilisateurs.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  lead: {
    marginTop: 8,
  },
  reactLogo: {
    height: 140,
    width: 230,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
