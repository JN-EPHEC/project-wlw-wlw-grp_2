import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  increment, 
  getDoc,
  query,
  collection,
  where,
  getDocs
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

/**
 * Alias pour checkIsFollowing
 */
export const isFollowing = async (currentUserId: string, targetUserId: string): Promise<boolean> => {
  return checkIsFollowing(currentUserId, targetUserId);
};

/**
 * Récupère la liste des followers d'un utilisateur
 */
export const getFollowers = async (userId: string): Promise<string[]> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data().followers || [];
    }
    return [];
  } catch (error) {
    console.error("❌ Erreur getFollowers:", error);
    return [];
  }
};

/**
 * Récupère la liste des utilisateurs que suit un utilisateur
 */
export const getFollowing = async (userId: string): Promise<string[]> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data().following || [];
    }
    return [];
  } catch (error) {
    console.error("❌ Erreur getFollowing:", error);
    return [];
  }
};

/**
 * Récupère les statistiques de suivi d'un utilisateur
 */
export const getFollowCounts = async (userId: string): Promise<{ followersCount: number; followingCount: number }> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        followersCount: data.stats?.followersCount || 0,
        followingCount: data.stats?.followingCount || 0
      };
    }
    return { followersCount: 0, followingCount: 0 };
  } catch (error) {
    console.error("❌ Erreur getFollowCounts:", error);
    return { followersCount: 0, followingCount: 0 };
  }
};

/**
 * Recherche des utilisateurs par nom ou email
 */
export const searchUsers = async (searchTerm: string): Promise<Array<{ id: string; name: string; email: string }>> => {
  try {
    if (!searchTerm.trim()) return [];
    
    const q = query(
      collection(db, 'users'),
      where('name', '>=', searchTerm),
      where('name', '<=', searchTerm + '\uf8ff')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name || '',
      email: doc.data().email || ''
    }));
  } catch (error) {
    console.error("❌ Erreur searchUsers:", error);
    return [];
  }
};

/**
 * Récupère les utilisateurs suggérés (non suivis)
 */
export const getSuggestedUsers = async (currentUserId: string, limit: number = 10): Promise<Array<{ id: string; name: string; email: string }>> => {
  try {
    const currentUserDoc = await getDoc(doc(db, 'users', currentUserId));
    const followingList = currentUserDoc.data()?.following || [];
    
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    const suggestedUsers = snapshot.docs
      .filter(doc => doc.id !== currentUserId && !followingList.includes(doc.id))
      .slice(0, limit)
      .map(doc => ({
        id: doc.id,
        name: doc.data().name || '',
        email: doc.data().email || ''
      }));
    
    return suggestedUsers;
  } catch (error) {
    console.error("❌ Erreur getSuggestedUsers:", error);
    return [];
  }
};

/**
 * Récupère les followers mutuels entre deux utilisateurs
 */
export const getMutualFollows = async (userId1: string, userId2: string): Promise<string[]> => {
  try {
    const user1Doc = await getDoc(doc(db, 'users', userId1));
    const user2Doc = await getDoc(doc(db, 'users', userId2));
    
    const followers1 = user1Doc.data()?.followers || [];
    const followers2 = user2Doc.data()?.followers || [];
    
    const mutualFollows = followers1.filter((id: string) => followers2.includes(id));
    return mutualFollows;
  } catch (error) {
    console.error("❌ Erreur getMutualFollows:", error);
    return [];
  }
};