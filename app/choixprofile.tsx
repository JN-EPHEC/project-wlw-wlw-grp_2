import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const COLORS = {
  orange: '#FBA31A',
  bleuNuit: '#242A65',
  violet: '#7459F0',
  blanc: '#FFFFFF',
  gris: '#6B7280',
};

export default function ChoixProfile() {
  const router = useRouter();

  // Fonction de navigation avec passage de paramètre
  const handleSelection = (role: 'learner' | 'creator') => {
    // ✅ Redirection vers /inscription avec le rôle choisi
    router.push({
      pathname: '/inscription',
      params: { role: role } 
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header avec bouton retour */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={32} color="black" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>S’inscrire</Text>
        <Text style={styles.subtitle}>Choisissez votre rôle</Text>

        <View style={styles.cardsContainer}>
          
          {/* Carte Formateur */}
          <View style={styles.card}>
            <View style={styles.imageContainer}>
                <Image 
                  source={{ uri: 'https://img.freepik.com/free-vector/online-certification-illustration_23-2148575636.jpg' }} 
                  style={styles.image}
                  resizeMode="contain"
                />
            </View>
            <Pressable 
              style={[styles.button, { backgroundColor: COLORS.orange }]}
              onPress={() => handleSelection('creator')}
            >
              <Text style={styles.buttonText}>Formateur</Text>
            </Pressable>
          </View>

          {/* Carte Apprenant */}
          <View style={styles.card}>
            <View style={styles.imageContainer}>
                <Image 
                  source={{ uri: 'https://img.freepik.com/free-vector/student-graduation-cap-using-laptop_1262-16723.jpg' }} 
                  style={styles.image} 
                  resizeMode="contain"
                />
            </View>
            <Pressable 
              style={[styles.button, { backgroundColor: COLORS.orange }]}
              onPress={() => handleSelection('learner')}
            >
              <Text style={styles.buttonText}>Apprenant</Text>
            </Pressable>
          </View>

        </View>

        <View style={styles.footer}>
            <Text style={styles.footerLink}>Politiques de confidentialité</Text>
            <Text style={styles.footerLink}>Besoin d'aide ?</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  cardsContainer: {
    width: '100%',
    gap: 30,
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  imageContainer: {
    width: 200,
    height: 180,
    marginBottom: -25, // Pour que le bouton chevauche un peu l'image
    zIndex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 12,
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.bleuNuit,
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  footerLink: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'underline',
  }
});