import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

export default function InitProgressScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const initializeUserProgress = async () => {
    setLoading(true);
    setStatus('Initialisation en cours...');

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Erreur', 'Aucun utilisateur connecté');
        setLoading(false);
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        setStatus('❌ Document utilisateur introuvable');
        setLoading(false);
        return;
      }

      setStatus('📝 Mise à jour des champs de progression...');

      // Ajouter tous les champs manquants
      await updateDoc(userRef, {
        // Stats de base
        videosVues: 0,
        joursConsecutifs: 0,
        minutesVisionnees: 0,
        
        // Badges
        badges: [],
        
        // Favoris et historique
        favorites: [],
        watchHistory: [],
        
        // Progression XP
        progressData: {
          currentXP: 0,
          level: 1,
          nextLevelXP: 100
        },
        
        // Dates
        derniereConnexion: new Date(),
        updatedAt: new Date()
      });

      setStatus('✅ Initialisation réussie !');
      
      setTimeout(() => {
        Alert.alert(
          'Succès',
          'Votre profil a été initialisé avec le système de progression !',
          [
            {
              text: 'Voir mon profil',
              onPress: () => router.push('/(tabs-apprenant)/profile')
            }
          ]
        );
      }, 1000);

    } catch (error) {
      console.error('Erreur initialisation:', error);
      setStatus('❌ Erreur lors de l\'initialisation');
      Alert.alert('Erreur', 'Impossible d\'initialiser les données');
    } finally {
      setLoading(false);
    }
  };

  const checkCurrentData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        
        let message = '📊 Données actuelles :\n\n';
        message += `✅ videosVues: ${data.videosVues ?? '❌ manquant'}\n`;
        message += `✅ joursConsecutifs: ${data.joursConsecutifs ?? '❌ manquant'}\n`;
        message += `✅ minutesVisionnees: ${data.minutesVisionnees ?? '❌ manquant'}\n`;
        message += `✅ badges: ${data.badges ? '✓' : '❌ manquant'}\n`;
        message += `✅ progressData: ${data.progressData ? '✓' : '❌ manquant'}\n`;
        
        if (data.progressData) {
          message += `\n🎯 Progression :\n`;
          message += `   Niveau: ${data.progressData.level}\n`;
          message += `   XP: ${data.progressData.currentXP}/${data.progressData.nextLevelXP}`;
        }

        Alert.alert('État actuel', message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>🎮 Initialisation Progression</Text>
        <Text style={styles.subtitle}>
          Cliquez sur le bouton ci-dessous pour initialiser votre système de progression
        </Text>

        {status !== '' && (
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={initializeUserProgress}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>🚀 Initialiser mon profil</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={checkCurrentData}
        >
          <Text style={[styles.buttonText, { color: '#9333EA' }]}>
            🔍 Vérifier l'état actuel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>ℹ️ Que fait cette initialisation ?</Text>
        <Text style={styles.infoText}>• Ajoute les champs manquants dans Firebase</Text>
        <Text style={styles.infoText}>• Configure le système XP (niveau 1, 0 XP)</Text>
        <Text style={styles.infoText}>• Initialise les compteurs de stats</Text>
        <Text style={styles.infoText}>• Prépare le système de badges</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#18181B',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#71717A',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  statusCard: {
    backgroundColor: '#F5EEFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 14,
    color: '#9333EA',
    textAlign: 'center',
    fontWeight: '600',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#9333EA',
  },
  secondaryButton: {
    backgroundColor: '#F5EEFF',
    borderWidth: 2,
    borderColor: '#E9D5FF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backText: {
    color: '#71717A',
    fontSize: 14,
  },
  infoBox: {
    marginTop: 24,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#18181B',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#71717A',
    marginBottom: 6,
    lineHeight: 20,
  },
});