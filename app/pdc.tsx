import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={28} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Politique de Confidentialité</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.lastUpdate}>Dernière mise à jour : 14 Décembre 2025</Text>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          Bienvenue sur SwipeSkills. 
          Nous accordons une grande importance à la protection de vos données personnelles. 
            Cette politique explique comment nous collectons, utilisons et protégeons vos informations lorsque vous utilisez notre application mobile d’apprentissage vidéo.
        </Text>

        <Text style={styles.sectionTitle}>2. Les données que nous collectons</Text>
        <Text style={styles.paragraph}>
          Pour fournir nos services, nous collectons les informations suivantes :
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Identité :</Text> Nom, prénom, date de naissance (via le formulaire d’inscription).</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Contact :</Text> Adresse email (pour l’authentification et la récupération de mot de passe).</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Contenu utilisateur :</Text> Photo de profil, biographie, commentaires postés, messages envoyés dans le chat.</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Données techniques :</Text> Images ou vidéos que vous choisissez de télécharger via l’accès à votre caméra ou galerie.</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Progression :</Text> Vidéos vues, favoris, objectifs d’apprentissage et badges obtenus.</Text>
        </View>

        <Text style={styles.sectionTitle}>3. Utilisation des données</Text>
        <Text style={styles.paragraph}>
          Vos données sont utilisées pour :
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletPoint}>• Créer et gérer votre compte utilisateur.</Text>
          <Text style={styles.bulletPoint}>• Vous permettre d’interagir avec d’autres apprenants (chat, commentaires).</Text>
          <Text style={styles.bulletPoint}>• Personnaliser votre fil d’actualité vidéo.</Text>
          <Text style={styles.bulletPoint}>• Suivre votre progression pédagogique (XP, Niveaux).</Text>
        </View>

        <Text style={styles.sectionTitle}>4. Permissions Appareil</Text>
        <Text style={styles.paragraph}>
              L’application peut demander l’accès à certaines fonctionnalités de votre téléphone :
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Caméra et Photos :</Text> Pour modifier votre photo de profil ou envoyer des images dans le chat.</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Notifications :</Text> Pour vous alerter des nouveaux messages ou cours.</Text>
        </View>
        <Text style={styles.paragraph}>
          Vous pouvez révoquer ces permissions à tout moment dans les réglages de votre téléphone.
        </Text>

        <Text style={styles.sectionTitle}>5. Stockage et Sécurité</Text>
        <Text style={styles.paragraph}>
          Nous utilisons les services de <Text style={styles.bold}>Google Firebase</Text> (Authentication, Firestore, Storage) pour héberger et sécuriser vos données. 
          Les mots de passe sont cryptés et ne sont jamais visibles par nos équipes.
        </Text>

        <Text style={styles.sectionTitle}>6. Vos Droits</Text>
        <Text style={styles.paragraph}>
          Conformément au RGPD, vous disposez d’un droit d’accès, de rectification et de suppression de vos données. 
          Vous pouvez modifier votre profil directement dans l’application ou supprimer votre compte en nous contactant.
        </Text>

        <Text style={styles.sectionTitle}>7. Contact</Text>
        <Text style={styles.paragraph}>
          Pour toute question relative à cette politique, vous pouvez nous contacter à : contact@swipeskills.app
        </Text>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginTop: Platform.OS === 'android' ? 30 : 0,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
    color: '#242A65',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  lastUpdate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#242A65', // Bleu nuit de ta charte
    marginTop: 20,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 10,
    textAlign: 'justify',
  },
  bulletList: {
    marginBottom: 10,
    paddingLeft: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 6,
  },
  bold: {
    fontWeight: 'bold',
  },
  spacer: {
    height: 50,
  },
});