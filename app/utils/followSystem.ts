import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  increment, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

/**
 * Permet à un utilisateur de suivre un créateur.
 * Met à jour la liste 'following' de l'utilisateur et 'followers' du créateur.
 * @param currentUserId - ID de l'utilisateur connecté (celui qui clique)
 * @param targetUserId - ID du créateur à suivre
 */
export const followUser = async (currentUserId: string, targetUserId: string) => {
  try {
    if (!currentUserId || !targetUserId) throw new Error("IDs invalides");

    const currentUserRef = doc(db, 'users', currentUserId);
    const targetUserRef = doc(db, 'users', targetUserId);

    // 1. Mettre à jour l'utilisateur courant (Ajout dans following)
    const p1 = updateDoc(currentUserRef, {
      following: arrayUnion(targetUserId),
      'stats.followingCount': increment(1)
    });

    // 2. Mettre à jour la cible (Ajout dans followers)
    const p2 = updateDoc(targetUserRef, {
      followers: arrayUnion(currentUserId),
      'stats.followersCount': increment(1)
    });

    await Promise.all([p1, p2]);

    console.log(`✅ ${currentUserId} suit ${targetUserId}`);
    return { success: true };

  } catch (error) {
    console.error("❌ Erreur followUser:", error);
    return { success: false, error };
  }
};

/**
 * Permet à un utilisateur de ne plus suivre un créateur.
 * @param currentUserId - ID de l'utilisateur connecté
 * @param targetUserId - ID du créateur
 */
export const unfollowUser = async (currentUserId: string, targetUserId: string) => {
  try {
    if (!currentUserId || !targetUserId) throw new Error("IDs invalides");

    const currentUserRef = doc(db, 'users', currentUserId);
    const targetUserRef = doc(db, 'users', targetUserId);

    // 1. Retirer de following
    const p1 = updateDoc(currentUserRef, {
      following: arrayRemove(targetUserId),
      'stats.followingCount': increment(-1)
    });

    // 2. Retirer de followers
    const p2 = updateDoc(targetUserRef, {
      followers: arrayRemove(currentUserId),
      'stats.followersCount': increment(-1)
    });

    await Promise.all([p1, p2]);

    console.log(`✅ ${currentUserId} a unfollow ${targetUserId}`);
    return { success: true };

  } catch (error) {
    console.error("❌ Erreur unfollowUser:", error);
    return { success: false, error };
  }
};

/**
 * Vérifie si l'utilisateur suit déjà la cible (pour l'état initial du bouton)
 */
export const checkIsFollowing = async (currentUserId: string, targetUserId: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', currentUserId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return data.following?.includes(targetUserId) || false;
    }
    return false;
  } catch (error) {
    console.error("❌ Erreur checkIsFollowing:", error);
    return false;
  }
};