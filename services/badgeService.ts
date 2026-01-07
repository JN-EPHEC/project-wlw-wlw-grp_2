import { doc, updateDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

export interface UnlockedBadge {
  badgeId: string;
  unlockedAt: any;
  badgeName: string;
  badgeIcon: string;
}

/**
 * ✅ CORRECTION : Sauvegarde d'un badge débloqué avec vérification
 */
export const saveBadgeUnlock = async (badge: {
  id: string;
  name: string;
  icon: string;
}) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log('❌ Pas d\'utilisateur connecté');
      return false;
    }

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log('❌ Document utilisateur introuvable');
      return false;
    }

    const currentBadges = userDoc.data().unlockedBadges || [];
    
    // ✅ Vérifier si déjà débloqué
    const alreadyUnlocked = currentBadges.some(
      (b: UnlockedBadge) => b.badgeId === badge.id
    );
    
    if (alreadyUnlocked) {
      console.log(`ℹ️ Badge ${badge.name} déjà débloqué`);
      return false;
    }

    const newBadge: UnlockedBadge = {
      badgeId: badge.id,
      unlockedAt: new Date(),
      badgeName: badge.name,
      badgeIcon: badge.icon,
    };

    // ✅ CORRECTION : Utiliser arrayUnion pour éviter les doublons
    await updateDoc(userRef, {
      unlockedBadges: arrayUnion(newBadge),
    });

    console.log(`✅ Badge ${badge.name} débloqué !`);
    return true;
  } catch (error) {
    console.error('❌ Erreur sauvegarde badge:', error);
    return false;
  }
};

/**
 * ✅ CORRECTION : Récupération des IDs de badges débloqués
 */
export const getUserUnlockedBadges = async (): Promise<string[]> => {
  try {
    const user = auth.currentUser;
    if (!user) return [];

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return [];

    const unlockedBadges = userDoc.data().unlockedBadges || [];
    return unlockedBadges.map((b: UnlockedBadge) => b.badgeId);
  } catch (error) {
    console.error('❌ Erreur récupération badges:', error);
    return [];
  }
};

/**
 * ✅ CORRECTION : Vérification des nouveaux badges débloqués
 */
export const checkNewBadges = async (
  currentBadges: Array<{ id: string; name: string; icon: string; unlocked: boolean }>
): Promise<Array<{ id: string; name: string; icon: string }>> => {
  try {
    console.log('🔍 Vérification nouveaux badges...');
    
    // ✅ Récupérer les badges déjà sauvegardés
    const savedBadgeIds = await getUserUnlockedBadges();
    console.log('📋 Badges déjà débloqués:', savedBadgeIds);
    
    const newlyUnlocked: Array<{ id: string; name: string; icon: string }> = [];

    // ✅ Pour chaque badge calculé comme débloqué
    for (const badge of currentBadges) {
      const shouldBeUnlocked = badge.unlocked;
      const isAlreadySaved = savedBadgeIds.includes(badge.id);
      
      console.log(`🎯 Badge ${badge.name}:`, {
        shouldBeUnlocked,
        isAlreadySaved,
        willSave: shouldBeUnlocked && !isAlreadySaved
      });
      
      // ✅ Si débloqué MAIS pas encore sauvegardé
      if (shouldBeUnlocked && !isAlreadySaved) {
        const saved = await saveBadgeUnlock(badge);
        if (saved) {
          newlyUnlocked.push(badge);
          console.log(`🎉 Nouveau badge débloqué: ${badge.name}`);
        }
      }
    }

    console.log(`✅ Total nouveaux badges: ${newlyUnlocked.length}`);
    return newlyUnlocked;
  } catch (error) {
    console.error('❌ Erreur vérification badges:', error);
    return [];
  }
};