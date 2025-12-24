import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

export interface UnlockedBadge {
  badgeId: string;
  unlockedAt: Date;
  badgeName: string;
  badgeIcon: string;
}

export const saveBadgeUnlock = async (badge: {
  id: string;
  name: string;
  icon: string;
}) => {
  try {
    const user = auth.currentUser;
    if (!user) return false;

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return false;

    const currentBadges = userDoc.data().unlockedBadges || [];
    
    const alreadyUnlocked = currentBadges.some(
      (b: UnlockedBadge) => b.badgeId === badge.id
    );
    
    if (alreadyUnlocked) return false;

    const newBadge: UnlockedBadge = {
      badgeId: badge.id,
      unlockedAt: new Date(),
      badgeName: badge.name,
      badgeIcon: badge.icon,
    };

    await updateDoc(userRef, {
      unlockedBadges: [...currentBadges, newBadge],
    });

    return true;
  } catch (error) {
    console.error('Erreur sauvegarde badge:', error);
    return false;
  }
};

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
    console.error('Erreur récupération badges:', error);
    return [];
  }
};

export const checkNewBadges = async (
  currentBadges: Array<{ id: string; name: string; icon: string; unlocked: boolean }>
): Promise<Array<{ id: string; name: string; icon: string }>> => {
  try {
    const savedBadgeIds = await getUserUnlockedBadges();
    const newlyUnlocked: Array<{ id: string; name: string; icon: string }> = [];

    for (const badge of currentBadges) {
      if (badge.unlocked && !savedBadgeIds.includes(badge.id)) {
        const saved = await saveBadgeUnlock(badge);
        if (saved) {
          newlyUnlocked.push(badge);
        }
      }
    }

    return newlyUnlocked;
  } catch (error) {
    console.error('Erreur vérification badges:', error);
    return [];
  }
};