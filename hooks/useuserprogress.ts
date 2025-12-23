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

  return {
    stats,
    videosProgress,
    loading,
    getXPProgressPercentage,
    refreshProgress: loadVideosProgress
  };
};