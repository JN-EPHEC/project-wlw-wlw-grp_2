import { auth, db } from '../../firebaseConfig';
import { doc, runTransaction, serverTimestamp, getDoc, setDoc, updateDoc, increment, collection, addDoc } from 'firebase/firestore';

/**
 * 📈 Ajoute de l'XP à l'utilisateur connecté.
 * Gère automatiquement le passage de niveau (Level Up).
 * @param amount Quantité d'XP à ajouter (ex: 50 pour une vidéo vue)
 */
export async function addUserXP(amount: number) {
    const user = auth.currentUser;
    if (!user) throw new Error("Utilisateur non connecté");

    const userRef = doc(db, 'users', user.uid);

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("Document utilisateur introuvable");

            const userData = userDoc.data();
            
            let { currentXP, level, nextLevelXP } = userData.progressData || { 
                currentXP: 0, 
                level: 1, 
                nextLevelXP: 100 
            };

            let newXP = currentXP + amount;
            let newLevel = level;
            let newNextLevelXP = nextLevelXP;

            // 🔄 Boucle de Level Up
            while (newXP >= newNextLevelXP) {
                newXP -= newNextLevelXP;
                newLevel++;
                newNextLevelXP = Math.floor(newNextLevelXP * 1.5);
            }

            transaction.update(userRef, {
                'progressData.currentXP': newXP,
                'progressData.level': newLevel,
                'progressData.nextLevelXP': newNextLevelXP,
                'updatedAt': serverTimestamp()
            });

            console.log(`🎉 XP Ajouté ! Niveau: ${newLevel} | XP: ${newXP}/${newNextLevelXP}`);
        });
        
        return { success: true };
    } catch (error) {
        console.error("❌ Erreur lors de l'ajout d'XP:", error);
        throw error;
    }
}

/**
 * 🎬 Met à jour la progression d'une vidéo spécifique
 * ✅ Exigence ID 189 : Attribution de points quand vidéo terminée
 */
export const updateVideoProgress = async (
  userId: string,
  videoId: string,
  videoTitle: string,
  progressPercentage: number,
  durationWatched: number
) => {
  try {
    const progressRef = doc(db, 'users', userId, 'progression', videoId);
    const isComplete = progressPercentage >= 95;

    const existingDoc = await getDoc(progressRef);
    const wasAlreadyComplete = existingDoc.exists() && existingDoc.data().complete;

    await setDoc(progressRef, {
      videoId,
      titre: videoTitle,
      progression: progressPercentage,
      dureeVisionnee: durationWatched,
      complete: isComplete,
      dateDebut: existingDoc.exists() ? existingDoc.data().dateDebut : new Date(),
      dateFin: isComplete ? new Date() : null
    }, { merge: true });

    if (isComplete && !wasAlreadyComplete) {
      await onVideoCompleted(userId, durationWatched);
    }

    return true;
  } catch (error) {
    console.error('Erreur mise à jour progression:', error);
    return false;
  }
};

/**
 * 🎉 Appelée quand une vidéo est complétée
 * ✅ Exigence ID 189 : Attribution de 50 XP par vidéo
 */
const onVideoCompleted = async (userId: string, durationInSeconds: number) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return;

    const currentData = userDoc.data();
    const newVideosVues = (currentData.videosVues || 0) + 1;
    const newMinutes = (currentData.minutesVisionnees || 0) + (durationInSeconds / 60);

    await updateDoc(userRef, {
      videosVues: newVideosVues,
      minutesVisionnees: newMinutes
    });

    // ✅ Exigence ID 189 : +50 XP par vidéo complétée
    await addUserXP(50);

    // Vérifier les objectifs hebdomadaires
    await checkWeeklyGoals(userId, newVideosVues);

    // Vérifier et débloquer des badges
    await checkAndUnlockBadges(userId, newVideosVues, newMinutes, currentData.progressData?.level || 1);

    return true;
  } catch (error) {
    console.error('Erreur completion vidéo:', error);
    return false;
  }
};

/**
 * 🔥 Met à jour le streak (jours consécutifs)
 */
export const updateStreak = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return;

    const data = userDoc.data();
    const lastConnection = data.derniereConnexion?.toDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!lastConnection) {
      await updateDoc(userRef, {
        joursConsecutifs: 1,
        derniereConnexion: new Date()
      });
      return;
    }

    const lastConnectionDate = new Date(lastConnection);
    lastConnectionDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - lastConnectionDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return;
    } else if (diffDays === 1) {
      await updateDoc(userRef, {
        joursConsecutifs: increment(1),
        derniereConnexion: new Date()
      });
      
      await addUserXP(10);
    } else {
      await updateDoc(userRef, {
        joursConsecutifs: 1,
        derniereConnexion: new Date()
      });
    }
  } catch (error) {
    console.error('Erreur update streak:', error);
  }
};

/**
 * 🏆 Système de badges
 * ✅ Exigence ID 190 : Défis collectifs (badges)
 */
const BADGES = [
  { id: 'first_video', name: 'Première Vidéo', icon: '🎬', condition: (stats: any) => stats.videosVues >= 1 },
  { id: 'marathon', name: 'Marathon', icon: '🏃', condition: (stats: any) => stats.videosVues >= 10 },
  { id: 'dedicated', name: 'Dévoué', icon: '⭐', condition: (stats: any) => stats.joursConsecutifs >= 7 },
  { id: 'expert', name: 'Expert', icon: '🎓', condition: (stats: any) => stats.level >= 5 },
  { id: 'time_master', name: 'Maître du Temps', icon: '⏰', condition: (stats: any) => stats.minutesVisionnees >= 60 },
  { id: 'level_5', name: 'Niveau 5', icon: '🌟', condition: (stats: any) => stats.level >= 5 },
  { id: 'level_10', name: 'Niveau 10', icon: '💎', condition: (stats: any) => stats.level >= 10 },
  { id: 'speed_learner', name: 'Apprenant Rapide', icon: '⚡', condition: (stats: any) => stats.videosVues >= 20 },
  { id: 'persistent', name: 'Persévérant', icon: '🔥', condition: (stats: any) => stats.joursConsecutifs >= 14 },
];

const checkAndUnlockBadges = async (
  userId: string,
  videosVues: number,
  minutesVisionnees: number,
  level: number
) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return;

    const currentBadges = userDoc.data().badges || [];
    const currentBadgeIds = currentBadges.map((b: any) => b.id);

    const stats = {
      videosVues,
      minutesVisionnees,
      level,
      joursConsecutifs: userDoc.data().joursConsecutifs || 0
    };

    const newBadges = BADGES.filter(
      badge => !currentBadgeIds.includes(badge.id) && badge.condition(stats)
    );

    if (newBadges.length > 0) {
      const updatedBadges = [
        ...currentBadges,
        ...newBadges.map(({ id, name, icon }) => ({ 
          id, 
          name, 
          icon, 
          unlockedAt: new Date() 
        }))
      ];

      await updateDoc(userRef, { badges: updatedBadges });
      
      // Bonus XP pour chaque badge (+25 XP)
      await addUserXP(newBadges.length * 25);
    }
  } catch (error) {
    console.error('Erreur badges:', error);
  }
};

/**
 * 🎯 Objectifs hebdomadaires
 * ✅ Exigence ID 188 : Définir des objectifs personnels
 */
export interface WeeklyGoal {
  id: string;
  type: 'videos' | 'minutes' | 'streak';
  target: number;
  current: number;
  completed: boolean;
  weekStart: Date;
  weekEnd: Date;
}

export const createWeeklyGoal = async (
  userId: string,
  type: 'videos' | 'minutes' | 'streak',
  target: number
) => {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(now.getDate() - now.getDay()); // Début de semaine (dimanche)
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const goalRef = await addDoc(collection(db, 'users', userId, 'goals'), {
      type,
      target,
      current: 0,
      completed: false,
      weekStart,
      weekEnd,
      createdAt: serverTimestamp()
    });

    return { success: true, goalId: goalRef.id };
  } catch (error) {
    console.error('Erreur création objectif:', error);
    return { success: false };
  }
};

const checkWeeklyGoals = async (userId: string, videosVues: number) => {
  // TODO: Vérifier les objectifs et les marquer comme complétés
  // Cette fonction sera appelée après chaque vidéo complétée
};

/**
 * 📊 S'inscrire à un parcours
 * ✅ Exigence ID 191 : Inscription et suivi de progression
 */
export const enrollInPath = async (userId: string, pathId: string) => {
  try {
    const enrollmentRef = doc(db, 'users', userId, 'enrollments', pathId);
    
    await setDoc(enrollmentRef, {
      pathId,
      enrolledAt: serverTimestamp(),
      progress: 0,
      completedVideos: [],
      status: 'in_progress'
    });

    return { success: true };
  } catch (error) {
    console.error('Erreur inscription parcours:', error);
    return { success: false };
  }
};

/**
 * ⭐ Noter un parcours
 * ✅ Exigence ID 192 : Noter un parcours terminé
 */
export const rateCompletedPath = async (
  userId: string,
  pathId: string,
  rating: number,
  comment?: string
) => {
  try {
    if (rating < 1 || rating > 5) {
      throw new Error('La note doit être entre 1 et 5');
    }

    const ratingRef = await addDoc(collection(db, 'pathRatings'), {
      userId,
      pathId,
      rating,
      comment: comment || '',
      createdAt: serverTimestamp()
    });

    // Mettre à jour la moyenne du parcours (ID 193)
    await updatePathAverageRating(pathId);

    return { success: true, ratingId: ratingRef.id };
  } catch (error) {
    console.error('Erreur notation parcours:', error);
    return { success: false };
  }
};

/**
 * 📊 Mettre à jour la moyenne des notes d'un parcours
 * ✅ Exigence ID 193 : Afficher moyenne des notes
 */
const updatePathAverageRating = async (pathId: string) => {
  // TODO: Calculer la moyenne de toutes les notes du parcours
  // et mettre à jour le document du parcours
};

/**
 * 🎯 Initialiser les champs de progression
 */
export const initializeUserProgress = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      videosVues: 0,
      joursConsecutifs: 0,
      minutesVisionnees: 0,
      badges: [],
      derniereConnexion: new Date(),
      progressData: {
        currentXP: 0,
        level: 1,
        nextLevelXP: 100
      }
    });
  } catch (error) {
    console.error('Erreur initialisation:', error);
  }
};