import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { useAuth } from '../_ProgressContext';
import { Ionicons } from '@expo/vector-icons';
// 1. Import du router
import { useRouter } from 'expo-router';

export default function ProfileFormateurScreen() {
  const { userProfile, signOut } = useAuth();
  // 2. Initialisation du router
  const router = useRouter();

  // 3. Fonction qui gère la déconnexion ET la redirection
  const handleSignOut = async () => {
    try {
      await signOut(); // Déconnexion Firebase
      router.replace('/auth'); // Redirection immédiate vers la page de connexion
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      {/* Avatar & Info */}
      <View style={styles.profileSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {userProfile?.prenom?.charAt(0).toUpperCase() || 'F'}
          </Text>
        </View>
        <Text style={styles.userName}>{userProfile?.prenom} {userProfile?.nom}</Text>
        <Text style={styles.userEmail}>{userProfile?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>Formateur</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="videocam" size={24} color="#9333ea" />
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Vidéos</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="eye" size={24} color="#9333ea" />
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Vues</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#9333ea" />
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Abonnés</Text>
        </View>
      </View>

      {/* Informations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{userProfile?.email}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Téléphone</Text>
            <Text style={styles.infoValue}>{userProfile?.telephone || 'Non renseigné'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rôle</Text>
            <Text style={styles.infoValue}>Formateur</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Niveau</Text>
            <Text style={styles.infoValue}>{userProfile?.profileLevel || 'Non renseigné'}</Text>
          </View>
        </View>
      </View>

      {/* Bouton déconnexion */}
      {/* 4. Utilisation de la nouvelle fonction handleSignOut */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#18181B',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#9333ea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#18181B',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#18181B',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#18181B',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#71717a',
  },
  infoValue: {
    fontSize: 14,
    color: '#18181B',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});