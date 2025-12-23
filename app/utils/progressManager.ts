import { auth, db } from '../../firebaseConfig';
import { doc, runTransaction, serverTimestamp, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

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
            
            // Récupérer les données actuelles ou mettre des valeurs par défaut
            let { currentXP, level, nextLevelXP } = userData.progressData || { 
                currentXP: 0, 
                level: 1, 
                nextLevelXP: 100 
            };

            // Ajouter l'XP
            let newXP = currentXP + amount;
            let newLevel = level;
            let newNextLevelXP = nextLevelXP;

            // 🔄 Boucle de Level Up (au cas où on gagne beaucoup d'XP d'un coup)
            while (newXP >= newNextLevelXP) {
                newXP -= newNextLevelXP; // On garde le surplus
                newLevel++;              // Niveau suivant
                newNextLevelXP = Math.floor(newNextLevelXP * 1.5); // Le prochain niveau est 50% plus dur
            }

            // Mise à jour atomique dans la base de données
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

    // Vérifier si la vidéo était déjà complétée
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

    // Si la vidéo vient d'être complétée (et n'était pas déjà complétée)
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
 */
const onVideoCompleted = async (userId: string, durationInSeconds: number) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return;

    const currentData = userDoc.data();
    const newVideosVues = (currentData.videosVues || 0) + 1;
    const newMinutes = (currentData.minutesVisionnees || 0) + (durationInSeconds / 60);

    // Mettre à jour les stats
    await updateDoc(userRef, {
      videosVues: newVideosVues,
      minutesVisionnees: newMinutes
    });

    // Donner de l'XP (50 XP par vidéo complétée)
    await addUserXP(50);

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
      // Première connexion
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
      // Même jour, ne rien faire
      return;
    } else if (diffDays === 1) {
      // Jour consécutif
      await updateDoc(userRef, {
        joursConsecutifs: increment(1),
        derniereConnexion: new Date()
      });
      
      // Bonus XP pour le streak (+10 XP)
      await addUserXP(10);
    } else {
      // Streak cassé
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
 */
const BADGES = [
  { id: 'first_video', name: 'Première Vidéo', icon: '🎬', condition: (stats: any) => stats.videosVues >= 1 },
  { id: 'marathon', name: 'Marathon', icon: '🏃', condition: (stats: any) => stats.videosVues >= 10 },
  { id: 'dedicated', name: 'Dévoué', icon: '⭐', condition: (stats: any) => stats.joursConsecutifs >= 7 },
  { id: 'expert', name: 'Expert', icon: '🎓', condition: (stats: any) => stats.level >= 5 },
  { id: 'time_master', name: 'Maître du Temps', icon: '⏰', condition: (stats: any) => stats.minutesVisionnees >= 60 },
  { id: 'level_5', name: 'Niveau 5', icon: '🌟', condition: (stats: any) => stats.level >= 5 },
  { id: 'level_10', name: 'Niveau 10', icon: '💎', condition: (stats: any) => stats.level >= 10 },
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
      
      // Bonus XP pour chaque badge débloqué (+25 XP par badge)
      await addUserXP(newBadges.length * 25);
    }
  } catch (error) {
    console.error('Erreur badges:', error);
  }
};

/**
 * 🎯 Initialiser les champs de progression lors de la création d'un utilisateur
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