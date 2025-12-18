import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#18181b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Politique de confidentialité</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {/* Icon & Date */}
        <View style={styles.iconContainer}>
          <View style={styles.iconBg}>
            <Ionicons name="shield-checkmark" size={32} color="#9333ea" />
          </View>
          <Text style={styles.lastUpdate}>Dernière mise à jour : 10 décembre 2024</Text>
        </View>

        {/* Introduction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.paragraph}>
            Bienvenue sur SwipeSkills. Nous nous engageons à protéger votre vie privée et vos données personnelles. 
            Cette politique de confidentialité explique comment nous collectons, utilisons et protégeons vos informations.
          </Text>
        </View>

        {/* Données collectées */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Données collectées</Text>
          <Text style={styles.paragraph}>Nous collectons les informations suivantes :</Text>
          <Text style={styles.listItem}>• Informations de compte (nom, prénom, email, nom d'utilisateur)</Text>
          <Text style={styles.listItem}>• Données de profil (photo, biographie, domaines d'expertise)</Text>
          <Text style={styles.listItem}>• Données d'utilisation (vidéos visionnées, likes, commentaires)</Text>
          <Text style={styles.listItem}>• Données de progression (badges, niveaux, XP)</Text>
          <Text style={styles.listItem}>• Contenu créé (vidéos, descriptions, hashtags)</Text>
        </View>

        {/* Utilisation des données */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Utilisation des données</Text>
          <Text style={styles.paragraph}>
            Vos données sont utilisées pour fournir et améliorer nos services, personnaliser votre expérience, 
            vous recommander du contenu pertinent, et communiquer avec vous concernant votre compte.
          </Text>
        </View>

        {/* Partage des données */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Partage des données</Text>
          <Text style={styles.paragraph}>
            Nous ne vendons jamais vos données personnelles. Vos informations peuvent être partagées uniquement 
            avec d'autres utilisateurs selon vos paramètres de confidentialité, ou si requis par la loi.
          </Text>
        </View>

        {/* Sécurité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Sécurité</Text>
          <Text style={styles.paragraph}>
            Nous utilisons des mesures de sécurité techniques et organisationnelles appropriées pour protéger 
            vos données contre tout accès non autorisé, modification, divulgation ou destruction.
          </Text>
        </View>

        {/* Vos droits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Vos droits</Text>
          <Text style={styles.paragraph}>Vous avez le droit de :</Text>
          <Text style={styles.listItem}>• Accéder à vos données personnelles</Text>
          <Text style={styles.listItem}>• Corriger vos informations</Text>
          <Text style={styles.listItem}>• Supprimer votre compte</Text>
          <Text style={styles.listItem}>• Exporter vos données</Text>
          <Text style={styles.listItem}>• Vous opposer au traitement de vos données</Text>
        </View>

        {/* Cookies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Cookies</Text>
          <Text style={styles.paragraph}>
            Nous utilisons des cookies et technologies similaires pour améliorer votre expérience, 
            analyser l'utilisation de notre application et personnaliser le contenu.
          </Text>
        </View>

        {/* Mineurs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Mineurs</Text>
          <Text style={styles.paragraph}>
            Notre service est destiné aux personnes âgées de 13 ans et plus. Nous ne collectons pas 
            sciemment d'informations personnelles d'enfants de moins de 13 ans.
          </Text>
        </View>

        {/* Modifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Modifications</Text>
          <Text style={styles.paragraph}>
            Nous pouvons mettre à jour cette politique de confidentialité. Nous vous informerons 
            de tout changement important par email ou via une notification dans l'application.
          </Text>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Contact</Text>
          <Text style={styles.paragraph}>
            Pour toute question concernant cette politique de confidentialité, contactez-nous à :{' '}
            <Text style={styles.link}>privacy@swipeskills.com</Text>
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
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
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#18181b',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#faf5ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  lastUpdate: {
    fontSize: 13,
    color: '#71717a',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#18181b',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: '#3f3f46',
    lineHeight: 24,
    marginBottom: 12,
  },
  listItem: {
    fontSize: 15,
    color: '#3f3f46',
    lineHeight: 24,
    paddingLeft: 8,
    marginBottom: 8,
  },
  link: {
    color: '#9333ea',
    textDecorationLine: 'underline',
  },
  bottomSpacer: {
    height: 40,
  },
});