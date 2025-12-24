import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

interface ProgressData {
  currentXP: number;
  level: number;
  nextLevelXP: number;
}

interface UserStats {
  videosVues: number;
  joursConsecutifs: number;
  minutesVisionnees: number;
  progressData: ProgressData;
  badges: any[];
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
    badges: []
  });
  const [videosProgress, setVideosProgress] = useState<VideoProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    // Écouter les changements en temps réel des stats utilisateur
    const unsubscribeUser = onSnapshot(
      doc(db, 'users', user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setStats({
            videosVues: data.videosVues || 0,
            joursConsecutifs: data.joursConsecutifs || 0,
            minutesVisionnees: data.minutesVisionnees || 0,
            progressData: data.progressData || {
              currentXP: 0,
              level: 1,
              nextLevelXP: 100
            },
            badges: data.badges || []
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error('Erreur stats:', error);
        setLoading(false);
      }
    );

    // Charger la progression des vidéos
    loadVideosProgress();

    return () => unsubscribeUser();
  }, []);

  const loadVideosProgress = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const progressRef = collection(db, 'users', user.uid, 'progression');
      const q = query(progressRef);
      const querySnapshot = await getDocs(q);
      
      const videos: VideoProgress[] = [];
      querySnapshot.forEach((doc) => {
        videos.push({ ...doc.data() } as VideoProgress);
      });
      
      setVideosProgress(videos);
    } catch (error) {
      console.error('Erreur chargement progression:', error);
    }
  };

  // Calculer le pourcentage XP pour la barre de progression
  const getXPProgressPercentage = () => {
    const { currentXP, nextLevelXP } = stats.progressData;
    return (currentXP / nextLevelXP) * 100;
  };

  // Fonction pour calculer les badges avec progression
  const getBadgesWithProgress = () => {
    const videosWatched = stats.videosVues;
    
    const allBadges = [
      {
        id: 'badge_1',
        name: 'Curieux',
        level: 'Bronze' as const,
        icon: '🌱',
        requirement: 5,
        description: '5 vidéos regardées',
        unlocked: videosWatched >= 5,
        progress: Math.min(100, Math.round((videosWatched / 5) * 100)),
      },
      {
        id: 'badge_2',
        name: 'Apprenant',
        level: 'Bronze' as const,
        icon: '🔥',
        requirement: 15,
        description: '15 vidéos regardées',
        unlocked: videosWatched >= 15,
        progress: Math.min(100, Math.round((videosWatched / 15) * 100)),
      },
      {
        id: 'badge_3',
        name: 'Motivé',
        level: 'Bronze' as const,
        icon: '⭐',
        requirement: 30,
        description: '30 vidéos regardées',
        unlocked: videosWatched >= 30,
        progress: Math.min(100, Math.round((videosWatched / 30) * 100)),
      },
      {
        id: 'badge_4',
        name: 'Passionné',
        level: 'Argent' as const,
        icon: '❤️',
        requirement: 60,
        description: '60 vidéos regardées',
        unlocked: videosWatched >= 60,
        progress: Math.min(100, Math.round((videosWatched / 60) * 100)),
      },
      {
        id: 'badge_5',
        name: 'Assidu',
        level: 'Argent' as const,
        icon: '🎯',
        requirement: 100,
        description: '100 vidéos regardées',
        unlocked: videosWatched >= 100,
        progress: Math.min(100, Math.round((videosWatched / 100) * 100)),
      },
      {
        id: 'badge_6',
        name: 'Expert',
        level: 'Or' as const,
        icon: '👑',
        requirement: 250,
        description: '250 vidéos regardées',
        unlocked: videosWatched >= 250,
        progress: Math.min(100, Math.round((videosWatched / 250) * 100)),
      },
    ];
    
    return allBadges;
  };

  // Fonction pour calculer les badges bonus
  const getBonusBadgesWithProgress = () => {
    const joursConsecutifs = stats.joursConsecutifs;
    
    return [
      {
        id: 'bonus_1',
        name: 'Régulier',
        icon: '⚡',
        description: '3 jours consécutifs',
        unlocked: joursConsecutifs >= 3,
      },
      {
        id: 'bonus_2',
        name: 'Marathonien',
        icon: '🏃',
        description: '20 vidéos/jour',
        unlocked: false,
      },
      {
        id: 'bonus_3',
        name: 'Noctambule',
        icon: '🌙',
        description: '5 vidéos 22h-6h',
        unlocked: false,
      },
      {
        id: 'bonus_4',
        name: 'Matinal',
        icon: '☀️',
        description: '5 vidéos avant 8h',
        unlocked: false,
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
    refreshProgress: loadVideosProgress
  };
};