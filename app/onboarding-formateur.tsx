
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const COMPETENCES = [
  { id: 'digital-marketing', label: 'Marketing Digital', icon: '📱' },
  { id: 'ia', label: 'Intelligence Artificielle', icon: '🤖' },
  { id: 'ecommerce', label: 'E-commerce', icon: '🛒' },
  { id: 'design', label: 'Design & UX', icon: '🎨' },
  { id: 'dev', label: 'Développement', icon: '💻' },
  { id: 'business', label: 'Business & Stratégie', icon: '📊' },
  { id: 'photo', label: 'Photographie', icon: '📷' },
  { id: 'video', label: 'Montage Vidéo', icon: '🎬' },
];

export default function OnboardingFormateurScreen() {
  const [step, setStep] = useState(1);
  const [selectedCompetences, setSelectedCompetences] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toggleCompetence = (id: string) => {
    setSelectedCompetences(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleComplete = async () => {
    if (selectedCompetences.length < 1) {
      Alert.alert('Attention', 'Sélectionnez au moins une compétence');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      await updateDoc(doc(db, 'users', user.uid), {
        competences: selectedCompetences,
        onboardingCompleted: true,
        stats: {
          videosCreated: 0,
          totalViews: 0,
          totalLikes: 0,
          followers: 0,
        },
        videos: [],
        followers: [],
      });

      Alert.alert('Succès', 'Profil créé avec succès ! 🎉');
      router.replace('/(tabs-formateur)/home');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 1 && (
          <View style={styles.stepContainer}>
            {/* Logo et titre */}
            <View style={styles.header}>
              <LinearGradient
                colors={['#a855f7', '#7e22ce']}
                style={styles.logoGradient}
              >
                <Text style={styles.logoEmoji}>🎓</Text>
              </LinearGradient>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>
                  Bienvenue sur <Text style={styles.titlePurple}>SwipeSkills</Text>
                </Text>
                <Text style={styles.subtitle}>
                  Partagez vos connaissances. Inspirez des milliers d'apprenants.
                </Text>
              </View>
            </View>

            {/* Features */}
            <View style={styles.featuresContainer}>
              <View style={[styles.featureCard, styles.purpleCard]}>
                <View style={[styles.featureIcon, styles.purpleIcon]}>
                  <Ionicons name="videocam" size={24} color="#fff" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Créez du contenu impactant</Text>
                  <Text style={styles.featureText}>Des vidéos courtes et engageantes</Text>
                </View>
              </View>

              <View style={[styles.featureCard, styles.orangeCard]}>
                <View style={[styles.featureIcon, styles.orangeIcon]}>
                  <Ionicons name="people" size={24} color="#fff" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Gagnez des abonnés</Text>
                  <Text style={styles.featureText}>Développez votre communauté</Text>
                </View>
              </View>

              <View style={[styles.featureCard, styles.blueCard]}>
                <View style={[styles.featureIcon, styles.blueIcon]}>
                  <Ionicons name="stats-chart" size={24} color="#fff" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Statistiques détaillées</Text>
                  <Text style={styles.featureText}>Suivez vos performances en temps réel</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.button} onPress={() => setStep(2)}>
              <Text style={styles.buttonText}>Commencer l'aventure</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            {/* Progress indicator */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, styles.progressActive]} />
              <View style={styles.progressBar} />
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>Vos compétences</Text>
              <Text style={styles.subtitle}>
                Sélectionnez les domaines dans lesquels vous allez créer du contenu
              </Text>
            </View>

            <View style={styles.interestsGrid}>
              {COMPETENCES.map(competence => (
                <TouchableOpacity
                  key={competence.id}
                  style={[
                    styles.interestCard,
                    selectedCompetences.includes(competence.id) && styles.interestCardSelected
                  ]}
                  onPress={() => toggleCompetence(competence.id)}
                >
                  <Text style={styles.interestEmoji}>{competence.icon}</Text>
                  <Text style={[
                    styles.interestLabel,
                    selectedCompetences.includes(competence.id) && styles.interestLabelSelected
                  ]}>
                    {competence.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, (!selectedCompetences.length || loading) && styles.buttonDisabled]}
                onPress={handleComplete}
                disabled={!selectedCompetences.length || loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Création de votre profil...' : 'C\'est parti ! 🚀'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.counter}>
                {selectedCompetences.length} compétence{selectedCompetences.length > 1 ? 's' : ''} sélectionnée{selectedCompetences.length > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
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
    padding: 24,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 40,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#18181b',
    textAlign: 'center',
    marginBottom: 8,
  },
  titlePurple: {
    color: '#9333ea',
  },
  subtitle: {
    fontSize: 16,
    color: '#52525b',
    textAlign: 'center',
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 32,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  purpleCard: {
    backgroundColor: '#faf5ff',
    borderColor: '#e9d5ff',
  },
  orangeCard: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  blueCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  purpleIcon: {
    backgroundColor: '#9333ea',
  },
  orangeIcon: {
    backgroundColor: '#f97316',
  },
  blueIcon: {
    backgroundColor: '#3b82f6',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#18181b',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 13,
    color: '#52525b',
  },
  button: {
    backgroundColor: '#9333ea',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e4e4e7',
    borderRadius: 2,
  },
  progressActive: {
    backgroundColor: '#9333ea',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  interestCard: {
    width: '47%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e4e4e7',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  interestCardSelected: {
    backgroundColor: '#9333ea',
    borderColor: '#9333ea',
  },
  interestEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  interestLabel: {
    fontSize: 13,
    color: '#18181b',
    textAlign: 'center',
  },
  interestLabelSelected: {
    color: '#fff',
  },
  footer: {
    gap: 12,
  },
  counter: {
    fontSize: 12,
    color: '#71717a',
    textAlign: 'center',
  },
});
