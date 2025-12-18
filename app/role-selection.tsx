import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function RoleSelectionScreen() {
  const router = useRouter();

  const handleSelectRole = (role: 'formateur' | 'apprenant') => {
  if (role === 'formateur') {
    router.push('/signup-formateur');
  } else {
    router.push('/signup-apprenant');
  }
};

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#18181b" />
          </TouchableOpacity>
          <Text style={styles.title}>S'inscrire</Text>
          <Text style={styles.subtitle}>Choisissez votre rôle</Text>
        </View>

        {/* Role cards */}
        <View style={styles.cardsContainer}>
          {/* Formateur */}
          <View style={styles.card}>
            <LinearGradient
              colors={['#dcfce7', '#fef3c7']}
              style={styles.cardGradient}
            >
              <View style={styles.decorativeCircle} />
              <View style={styles.cardContent}>
                <View style={styles.illustrationContainer}>
                  <LinearGradient
                    colors={['#4ade80', '#facc15']}
                    style={styles.illustration}
                  >
                    <Ionicons name="book" size={64} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={styles.roleTitle}>Formateur</Text>
                <Text style={styles.roleDescription}>
                  Partagez vos connaissances et créez du contenu éducatif
                </Text>
                <TouchableOpacity
                  style={styles.roleButton}
                  onPress={() => handleSelectRole('formateur')}
                >
                  <Text style={styles.roleButtonText}>Formateur</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* Apprenant */}
          <View style={styles.card}>
            <LinearGradient
              colors={['#fce7f3', '#f3e8ff']}
              style={styles.cardGradient}
            >
              <View style={styles.decorativeCircle} />
              <View style={styles.cardContent}>
                <View style={styles.illustrationContainer}>
                  <LinearGradient
                    colors={['#f472b6', '#a855f7']}
                    style={styles.illustration}
                  >
                    <Ionicons name="bulb" size={64} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={styles.roleTitle}>Apprenant</Text>
                <Text style={styles.roleDescription}>
                  Découvrez de nouvelles compétences et progressez
                </Text>
                <TouchableOpacity
                  style={styles.roleButton}
                  onPress={() => handleSelectRole('apprenant')}
                >
                  <Text style={styles.roleButtonText}>Apprenant</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.loginPrompt}>
          <Text style={styles.loginPromptText}>Vous avez déjà un compte ? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.loginLink}>Se connecter</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
            <Text style={styles.footerLinkText}>Politique de confidentialité</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/help')}>
            <Text style={styles.footerLinkText}>Besoin d'aide ?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 160,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#18181b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#52525b',
  },
  cardsContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardGradient: {
    position: 'relative',
    padding: 16,
  },
  decorativeCircle: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(74, 222, 128, 0.3)',
  },
  cardContent: {
    position: 'relative',
    zIndex: 10,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  illustration: {
    width: 128,
    height: 128,
    borderRadius: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#18181b',
    textAlign: 'center',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 13,
    color: '#52525b',
    textAlign: 'center',
    marginBottom: 16,
  },
  roleButton: {
    backgroundColor: '#f97316',
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    gap: 16,
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginPromptText: {
    color: '#52525b',
    fontSize: 14,
  },
  loginLink: {
    color: '#2563eb',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  footerLinkText: {
    fontSize: 13,
    color: '#71717a',
  },
});