import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

interface ProgressData {
  currentXP: number;
  level: number;
  nextLevelXP: number;
}

interface UnlockedBadge {
  badgeId: string;
  unlockedAt: any;
  badgeName: string;
  badgeIcon: string;
}

interface UserStats {
  videosVues: number;
  joursConsecutifs: number;
  minutesVisionnees: number;
  progressData: ProgressData;
  badges: any[];
  unlockedBadges: UnlockedBadge[];
  watchHistory: string[];
}

interface VideoProgress {
  videoId: string;
  titre: string;
  progression: number;
  complete: boolean;
  dateDebut: any;
  dateFin: any;
}

export const useUserProgress = () => {
  const [stats, setStats] = useState<UserStats>({
    videosVues: 0,
    joursConsecutifs: 0,
    minutesVisionnees: 0,
    progressData: {
      currentXP: 0,
      level: 1,
      nextLevelXP: 100
    },
    badges: [],
    unlockedBadges: [],
    watchHistory: []
  });
  const [videosProgress, setVideosProgress] = useState<VideoProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    // ✅ CORRECTION : Écouter les changements en temps réel
    const unsubscribeUser = onSnapshot(
      doc(db, 'users', user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // ✅ CORRECTION : Mapper les vrais champs Firebase
          const watchHistory = data.watchHistory || [];
          const videosVuesCount = watchHistory.length;
          
          setStats({
            videosVues: videosVuesCount,
            joursConsecutifs: data.stats?.streak || 0, // ✅ Corrigé
            minutesVisionnees: data.stats?.totalMinutes || 0, // ✅ Corrigé
            progressData: data.progressData || {
              currentXP: videosVuesCount * 10, // 10 XP par vidéo
              level: Math.floor(videosVuesCount / 10) + 1,
              nextLevelXP: (Math.floor(videosVuesCount / 10) + 1) * 100
            },
            badges: data.badges || [],
            unlockedBadges: data.unlockedBadges || [],
            watchHistory: watchHistory
          });
          
          console.log('📊 Hook useUserProgress - Stats chargées:', {
            videosVues: videosVuesCount,
            watchHistory: watchHistory.length,
            unlockedBadges: data.unlockedBadges?.length || 0,
            streak: data.stats?.streak || 0,
            totalMinutes: data.stats?.totalMinutes || 0
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error('❌ Erreur stats:', error);
        setLoading(false);
      }
    );

    return () => unsubscribeUser();
  }, []);

  // Calculer le pourcentage XP pour la barre de progression
  const getXPProgressPercentage = () => {
    const { currentXP, nextLevelXP } = stats.progressData;
    if (nextLevelXP === 0) return 0;
    return Math.min(100, (currentXP / nextLevelXP) * 100);
  };

  // ✅ CORRECTION : Fonction pour calculer les badges avec progression
  const getBadgesWithProgress = () => {
    const videosWatched = stats.videosVues;
    const unlockedBadgeIds = stats.unlockedBadges.map(b => b.badgeId);
    
    const allBadges = [
      {
        id: 'badge_1',
        name: 'Curieux',
        level: 'Bronze' as const,
        icon: '🌱',
        requirement: 5,
        description: '5 vidéos regardées',
        unlocked: unlockedBadgeIds.includes('badge_1') || videosWatched >= 5,
        progress: Math.min(100, Math.round((videosWatched / 5) * 100)),
      },
      {
        id: 'badge_2',
        name: 'Apprenant',
        level: 'Bronze' as const,
        icon: '🔥',
        requirement: 15,
        description: '15 vidéos regardées',
        unlocked: unlockedBadgeIds.includes('badge_2') || videosWatched >= 15,
        progress: Math.min(100, Math.round((videosWatched / 15) * 100)),
      },
      {
        id: 'badge_3',
        name: 'Motivé',
        level: 'Bronze' as const,
        icon: '⭐',
        requirement: 30,
        description: '30 vidéos regardées',
        unlocked: unlockedBadgeIds.includes('badge_3') || videosWatched >= 30,
        progress: Math.min(100, Math.round((videosWatched / 30) * 100)),
      },
      {
        id: 'badge_4',
        name: 'Passionné',
        level: 'Argent' as const,
        icon: '❤️',
        requirement: 60,
        description: '60 vidéos regardées',
        unlocked: unlockedBadgeIds.includes('badge_4') || videosWatched >= 60,
        progress: Math.min(100, Math.round((videosWatched / 60) * 100)),
      },
      {
        id: 'badge_5',
        name: 'Assidu',
        level: 'Argent' as const,
        icon: '🎯',
        requirement: 100,
        description: '100 vidéos regardées',
        unlocked: unlockedBadgeIds.includes('badge_5') || videosWatched >= 100,
        progress: Math.min(100, Math.round((videosWatched / 100) * 100)),
      },
      {
        id: 'badge_6',
        name: 'Expert',
        level: 'Or' as const,
        icon: '👑',
        requirement: 250,
        description: '250 vidéos regardées',
        unlocked: unlockedBadgeIds.includes('badge_6') || videosWatched >= 250,
        progress: Math.min(100, Math.round((videosWatched / 250) * 100)),
      },
    ];
    
    console.log('🎯 Badges calculés dans hook:', {
      videosWatched,
      unlockedBadgeIds,
      badgesUnlocked: allBadges.filter(b => b.unlocked).length,
      badgesList: allBadges.filter(b => b.unlocked).map(b => b.name)
    });
    
    return allBadges;
  };

  // ✅ CORRECTION : Fonction pour calculer les badges bonus
  const getBonusBadgesWithProgress = () => {
    const joursConsecutifs = stats.joursConsecutifs;
    const unlockedBadgeIds = stats.unlockedBadges.map(b => b.badgeId);
    
    return [
      {
        id: 'bonus_1',
        name: 'Régulier',
        icon: '⚡',
        description: '3 jours consécutifs',
        unlocked: unlockedBadgeIds.includes('bonus_1') || joursConsecutifs >= 3,
      },
      {
        id: 'bonus_2',
        name: 'Marathonien',
        icon: '🏃',
        description: '20 vidéos/jour',
        unlocked: unlockedBadgeIds.includes('bonus_2'),
      },
      {
        id: 'bonus_3',
        name: 'Noctambule',
        icon: '🌙',
        description: '5 vidéos 22h-6h',
        unlocked: unlockedBadgeIds.includes('bonus_3'),
      },
      {
        id: 'bonus_4',
        name: 'Matinal',
        icon: '☀️',
        description: '5 vidéos avant 8h',
        unlocked: unlockedBadgeIds.includes('bonus_4'),
      },
    ];
  };

  return {
    stats,
    videosProgress,
    loading,
    getXPProgressPercentage,
    getBadgesWithProgress,
    getBonusBadgesWithProgress,
  };
};