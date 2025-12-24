import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useUserProgress } from '../hooks/useuserprogress';
import { checkNewBadges } from '../services/badgeService';

interface Badge {
  id: string;
  name: string;
  level: 'Bronze' | 'Argent' | 'Or';
  icon: string;
  requirement: number;
  description: string;
  unlocked: boolean;
  progress: number;
}

interface BonusBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
}

export default function BadgesScreen() {
  const router = useRouter();
  const { getBadgesWithProgress, getBonusBadgesWithProgress, loading: progressLoading } = useUserProgress();
  
  const [badges, setBadges] = useState<Badge[]>([]);
  const [bonusBadges, setBonusBadges] = useState<BonusBadge[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showToast, setShowToast] = useState(false);
  const [toastAnimation] = useState(new Animated.Value(-100));
  const [newlyUnlockedBadge, setNewlyUnlockedBadge] = useState<Badge | null>(null);

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      setLoading(true);
      const allBadges = getBadgesWithProgress();
      const allBonusBadges = getBonusBadgesWithProgress();
      
      setBadges(allBadges);
      setBonusBadges(allBonusBadges);
      
      const newBadges = await checkNewBadges(allBadges);
      if (newBadges.length > 0) {
        const badge = allBadges.find(b => b.id === newBadges[0].id);
        if (badge) {
          setNewlyUnlockedBadge(badge);
          showBadgeUnlockedToast();
        }
      }
    } catch (error) {
      console.error('Erreur chargement badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const showBadgeUnlockedToast = () => {
    setShowToast(true);
    Animated.sequence([
      Animated.spring(toastAnimation, {
        toValue: 20,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.delay(3000),
      Animated.timing(toastAnimation, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowToast(false));
  };

  const getNextBadge = () => {
    return badges.find(badge => !badge.unlocked);
  };

  const nextBadge = getNextBadge();

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Bronze': return '#CD7F32';
      case 'Argent': return '#C0C0C0';
      case 'Or': return '#FFD700';
      default: return '#CD7F32';
    }
  };

  if (loading || progressLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Toast de notification */}
      {showToast && newlyUnlockedBadge && (
        <Animated.View 
          style={[styles.toastContainer, { transform: [{ translateY: toastAnimation }] }]}
        >
          <View style={styles.toast}>
            <Text style={styles.toastIcon}>🎉</Text>
            <View style={styles.toastContent}>
              <Text style={styles.toastTitle}>Bravo !</Text>
              <Text style={styles.toastMessage}>
                Tu as débloqué le badge {newlyUnlockedBadge.icon} {newlyUnlockedBadge.name} !
              </Text>
            </View>
            <Text style={styles.toastCelebration}>🎊</Text>
          </View>
        </Animated.View>
      )}

      {/* Header avec gradient violet */}
      <LinearGradient 
        colors={['#9333ea', '#7c3aed']} 
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.push('/(tabs-apprenant)/profile')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏆 Mes Badges</Text>
      </LinearGradient>

      {/* Contenu sur fond blanc */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        {/* Section Prochain Badge */}
        {nextBadge && (
          <View style={styles.nextBadgeSection}>
            <View style={styles.nextBadgeHeader}>
              <View style={styles.nextBadgeIconContainer}>
                <Text style={styles.nextBadgeIconLarge}>{nextBadge.icon}</Text>
              </View>
              <View style={styles.nextBadgeInfo}>
                <Text style={styles.nextBadgeTitle}>Prochain Badge: {nextBadge.name}</Text>
                <Text style={styles.nextBadgeSubtitle}>
                  {nextBadge.progress > 0 
                    ? `Plus que ${nextBadge.requirement - Math.round(nextBadge.requirement * nextBadge.progress / 100)} vidéos pour débloquer! 🔥`
                    : `Regardez ${nextBadge.requirement} vidéos pour débloquer ce badge !`
                  }
                </Text>
              </View>
            </View>
            
            {nextBadge.progress > 0 && (
              <>
                <View style={styles.nextBadgeProgressBar}>
                  <View style={[styles.nextBadgeProgressFill, { width: `${nextBadge.progress}%` }]} />
                </View>
                <Text style={styles.nextBadgeProgressText}>
                  {Math.round(nextBadge.requirement * nextBadge.progress / 100)}/{nextBadge.requirement} vidéos ({nextBadge.progress}%)
                </Text>
              </>
            )}
          </View>
        )}

        {/* Main Badges Grid */}
        <View style={styles.badgesGrid}>
          {badges.map((badge) => {
            const isLocked = !badge.unlocked && badge.progress === 0;
            const inProgress = !badge.unlocked && badge.progress > 0;

            return (
              <View key={badge.id} style={styles.badgeCard}>
                <View style={[styles.badgeIconContainer, isLocked && styles.badgeIconLocked]}>
                  <Text style={[styles.badgeIcon, isLocked && styles.badgeIconLockedText]}>
                    {isLocked ? '🔒' : badge.icon}
                  </Text>
                  {badge.unlocked && (
                    <View style={styles.checkmarkContainer}>
                      <Text style={styles.checkmark}>✓</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.badgeName, isLocked && styles.badgeNameLocked]}>
                  {badge.name}
                </Text>

                <View style={[styles.badgeLevel, { backgroundColor: getLevelColor(badge.level) }, isLocked && styles.badgeLevelLocked]}>
                  <Text style={styles.badgeLevelText}>{badge.level}</Text>
                </View>

                <Text style={[styles.badgeDescription, isLocked && styles.badgeDescriptionLocked]}>
                  {badge.description}
                </Text>

                {inProgress && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBarBackground}>
                      <View style={[styles.progressBarFill, { width: `${badge.progress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{badge.progress}%</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Bonus Badges Section */}
        <View style={styles.bonusSection}>
          <Text style={styles.bonusTitle}>🎁 Badges Bonus</Text>
          <View style={styles.bonusBadgesContainer}>
            {bonusBadges.map((badge) => {
              const isLocked = !badge.unlocked;
              return (
                <View key={badge.id} style={styles.bonusBadgeCard}>
                  <Text style={[styles.bonusBadgeIcon, isLocked && styles.bonusBadgeIconLocked]}>
                    {badge.icon}
                  </Text>
                  <Text style={[styles.bonusBadgeName, isLocked && styles.bonusBadgeNameLocked]}>
                    {badge.name}
                  </Text>
                  <Text style={[styles.bonusBadgeDescription, isLocked && styles.bonusBadgeDescriptionLocked]}>
                    {badge.description}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF' 
  },
  toastContainer: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    zIndex: 1000, 
    paddingHorizontal: 20 
  },
  toast: { 
    backgroundColor: '#10B981', 
    borderRadius: 16, 
    padding: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 8 
  },
  toastIcon: { fontSize: 40, marginRight: 12 },
  toastContent: { flex: 1 },
  toastTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  toastMessage: { fontSize: 14, color: '#FFFFFF' },
  toastCelebration: { fontSize: 32, marginLeft: 8 },
  
  header: { 
    paddingHorizontal: 20, 
    paddingTop: 60, 
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: { marginBottom: 10 },
  backButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' },
  
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  
  nextBadgeSection: { 
    marginHorizontal: 20, 
    marginTop: 20,
    marginBottom: 25, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 20, 
    borderWidth: 2, 
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextBadgeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  nextBadgeIconContainer: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: '#f3f4f6', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15 
  },
  nextBadgeIconLarge: { fontSize: 36 },
  nextBadgeInfo: { flex: 1 },
  nextBadgeTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  nextBadgeSubtitle: { fontSize: 13, color: '#6b7280' },
  nextBadgeProgressBar: { 
    width: '100%', 
    height: 10, 
    backgroundColor: '#f3f4f6', 
    borderRadius: 5, 
    overflow: 'hidden', 
    marginBottom: 8 
  },
  nextBadgeProgressFill: { height: '100%', backgroundColor: '#9333ea', borderRadius: 5 },
  nextBadgeProgressText: { color: '#6b7280', fontSize: 13, textAlign: 'center', fontWeight: '600' },
  
  badgesGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    paddingHorizontal: 10, 
    justifyContent: 'space-between' 
  },
  badgeCard: { 
    width: '48%', 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 15, 
    marginHorizontal: '1%', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeIconContainer: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#f3f4f6', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 15, 
    position: 'relative' 
  },
  badgeIconLocked: { backgroundColor: '#f9fafb' },
  badgeIcon: { fontSize: 40 },
  badgeIconLockedText: { opacity: 0.3 },
  checkmarkContainer: { 
    position: 'absolute', 
    top: -5, 
    right: -5, 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: '#10B981', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  checkmark: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  badgeName: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 8, textAlign: 'center' },
  badgeNameLocked: { opacity: 0.4, color: '#9ca3af' },
  badgeLevel: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, marginBottom: 8 },
  badgeLevelLocked: { opacity: 0.3 },
  badgeLevelText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  badgeDescription: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  badgeDescriptionLocked: { opacity: 0.4 },
  progressContainer: { width: '100%', marginTop: 12 },
  progressBarBackground: { 
    width: '100%', 
    height: 8, 
    backgroundColor: '#f3f4f6', 
    borderRadius: 4, 
    overflow: 'hidden' 
  },
  progressBarFill: { height: '100%', backgroundColor: '#9333ea', borderRadius: 4 },
  progressText: { color: '#6b7280', fontSize: 12, textAlign: 'right', marginTop: 4, fontWeight: '600' },
  
  bonusSection: { marginTop: 30, paddingHorizontal: 20, marginBottom: 40 },
  bonusTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 20 },
  bonusBadgesContainer: { 
    backgroundColor: '#fef2f2', 
    borderRadius: 20, 
    padding: 20, 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  bonusBadgeCard: { width: '48%', alignItems: 'center', marginBottom: 20 },
  bonusBadgeIcon: { fontSize: 50, marginBottom: 8 },
  bonusBadgeIconLocked: { opacity: 0.3 },
  bonusBadgeName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 4, textAlign: 'center' },
  bonusBadgeNameLocked: { opacity: 0.5, color: '#9ca3af' },
  bonusBadgeDescription: { fontSize: 12, color: '#6b7280', textAlign: 'center' },
  bonusBadgeDescriptionLocked: { opacity: 0.4 },
});