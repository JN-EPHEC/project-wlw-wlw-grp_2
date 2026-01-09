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

    console.log(`✅ Badge ${badge.name} débloqué et sauvegardé dans Firebase !`);
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
    
    // ✅ Récupérer les badges déjà sauvegardés dans Firebase
    const savedBadgeIds = await getUserUnlockedBadges();
    
    // ✅ Compter les badges calculés comme débloqués
    const calculatedUnlockedBadges = currentBadges.filter(b => b.unlocked);
    
    console.log('📊 État actuel des badges:', {
      totalBadges: currentBadges.length,
      calculatedUnlocked: calculatedUnlockedBadges.length,
      savedInFirebase: savedBadgeIds.length,
      calculatedList: calculatedUnlockedBadges.map(b => b.name),
      savedList: savedBadgeIds
    });
    
    const newlyUnlocked: Array<{ id: string; name: string; icon: string }> = [];

    // ✅ Pour chaque badge calculé comme débloqué
    for (const badge of currentBadges) {
      const shouldBeUnlocked = badge.unlocked;
      const isAlreadySaved = savedBadgeIds.includes(badge.id);
      
      // ✅ Si débloqué MAIS pas encore sauvegardé dans Firebase
      if (shouldBeUnlocked && !isAlreadySaved) {
        console.log(`🎉 NOUVEAU badge détecté: ${badge.name} (${badge.id})`);
        const saved = await saveBadgeUnlock(badge);
        if (saved) {
          newlyUnlocked.push(badge);
        }
      }
    }

    if (newlyUnlocked.length > 0) {
      console.log(`✅ ${newlyUnlocked.length} nouveau(x) badge(s) débloqué(s) pendant cette session:`, 
        newlyUnlocked.map(b => b.name));
    } else {
      console.log(`ℹ️ Aucun nouveau badge cette session (${calculatedUnlockedBadges.length} badge(s) déjà débloqué(s))`);
    }
    
    return newlyUnlocked;
  } catch (error) {
    console.error('❌ Erreur vérification badges:', error);
    return [];
  }
};