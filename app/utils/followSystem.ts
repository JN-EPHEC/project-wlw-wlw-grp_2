import { auth, db } from '../../firebaseConfig';
import { 
  doc,
  collection,
  setDoc, 
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  increment, 
  updateDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';

/**
 * ➕ SUIVRE un utilisateur
 */
export async function followUser(targetUserId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  if (user.uid === targetUserId) {
    throw new Error('Impossible de se suivre soi-même');
  }

  const followId = `${user.uid}_${targetUserId}`;
  const followRef = doc(db, 'follows', followId);

  // Vérifier si déjà suivi
  const followSnap = await getDoc(followRef);
  if (followSnap.exists()) {
    throw new Error('Utilisateur déjà suivi');
  }

  const batch = writeBatch(db);

  // Créer le follow
  batch.set(followRef, {
    followerId: user.uid,
    followingId: targetUserId,
    createdAt: serverTimestamp(),
  });

  // Incrémenter followingCount pour l'utilisateur actuel
  const currentUserRef = doc(db, 'users', user.uid);
  batch.update(currentUserRef, {
    'stats.followingCount': increment(1),
  });

  // Incrémenter followersCount pour l'utilisateur cible
  const targetUserRef = doc(db, 'users', targetUserId);
  batch.update(targetUserRef, {
    'stats.followersCount': increment(1),
  });

  await batch.commit();

  return { success: true };
}

/**
 * ➖ NE PLUS SUIVRE un utilisateur
 */
export async function unfollowUser(targetUserId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  const followId = `${user.uid}_${targetUserId}`;
  const followRef = doc(db, 'follows', followId);

  // Vérifier si le follow existe
  const followSnap = await getDoc(followRef);
  if (!followSnap.exists()) {
    throw new Error('Utilisateur non suivi');
  }

  const batch = writeBatch(db);

  // Supprimer le follow
  batch.delete(followRef);

  // Décrémenter followingCount pour l'utilisateur actuel
  const currentUserRef = doc(db, 'users', user.uid);
  batch.update(currentUserRef, {
    'stats.followingCount': increment(-1),
  });

  // Décrémenter followersCount pour l'utilisateur cible
  const targetUserRef = doc(db, 'users', targetUserId);
  batch.update(targetUserRef, {
    'stats.followersCount': increment(-1),
  });

  await batch.commit();

  return { success: true };
}

/**
 * ❓ Vérifier si l'utilisateur suit un autre utilisateur
 */
export async function isFollowing(targetUserId: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  const followId = `${user.uid}_${targetUserId}`;
  const followRef = doc(db, 'follows', followId);
  const followSnap = await getDoc(followRef);

  return followSnap.exists();
}

/**
 * 👥 Récupérer la liste des abonnés (followers) d'un utilisateur
 */
export async function getFollowers(userId: string, limitCount: number = 50) {
  const followsRef = collection(db, 'follows');
  const q = query(
    followsRef,
    where('followingId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  const followerIds = querySnapshot.docs.map(doc => doc.data().followerId);

  // Récupérer les profils des followers
  if (followerIds.length === 0) return [];

  const followerProfiles = await Promise.all(
    followerIds.map(async (id) => {
      const userRef = doc(db, 'users', id);
      const userSnap = await getDoc(userRef);
      return {
        id: userSnap.id,
        ...userSnap.data(),
      };
    })
  );

  return followerProfiles;
}

/**
 * 👤 Récupérer la liste des abonnements (following) d'un utilisateur
 */
export async function getFollowing(userId: string, limitCount: number = 50) {
  const followsRef = collection(db, 'follows');
  const q = query(
    followsRef,
    where('followerId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  const followingIds = querySnapshot.docs.map(doc => doc.data().followingId);

  // Récupérer les profils des utilisateurs suivis
  if (followingIds.length === 0) return [];

  const followingProfiles = await Promise.all(
    followingIds.map(async (id) => {
      const userRef = doc(db, 'users', id);
      const userSnap = await getDoc(userRef);
      return {
        id: userSnap.id,
        ...userSnap.data(),
      };
    })
  );

  return followingProfiles;
}

/**
 * 🔢 Compter les followers et following
 */
export async function getFollowCounts(userId: string) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error('Utilisateur introuvable');
  }

  const userData = userSnap.data();

  return {
    followersCount: userData.stats?.followersCount || 0,
    followingCount: userData.stats?.followingCount || 0,
  };
}

/**
 * 🔍 Rechercher des utilisateurs par nom d'utilisateur
 */
export async function searchUsers(searchTerm: string, limitCount: number = 20) {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return [];
  }

  const usersRef = collection(db, 'users');
  
  // Firestore ne supporte pas la recherche partielle nativement
  // On doit récupérer tous les utilisateurs et filtrer côté client
  // Pour une meilleure performance en production, utilisez Algolia ou ElasticSearch
  
  const q = query(usersRef, limit(100));
  const querySnapshot = await getDocs(q);
  
  const searchLower = searchTerm.toLowerCase();
  const users = querySnapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))
    .filter(user => {
      const username = ((user as any).username || '').toLowerCase();
const bio = ((user as any).bio || '').toLowerCase();
      return username.includes(searchLower) || bio.includes(searchLower);
    })
    .slice(0, limitCount);

  return users;
}

/**
 * 💡 Récupérer des suggestions d'utilisateurs à suivre
 */
export async function getSuggestedUsers(limitCount: number = 10) {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  // Récupérer les utilisateurs que l'utilisateur actuel suit
  const followingIds = await getFollowing(user.uid).then(
    users => users.map(u => u.id)
  );

  // Récupérer des utilisateurs aléatoires (sauf ceux déjà suivis)
  const usersRef = collection(db, 'users');
  const q = query(usersRef, limit(50));
  const querySnapshot = await getDocs(q);

  const suggestedUsers = querySnapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))
    .filter(u => {
      // Exclure l'utilisateur actuel et ceux déjà suivis
      return u.id !== user.uid && !followingIds.includes(u.id);
    })
    .slice(0, limitCount);

  return suggestedUsers;
}

/**
 * 🎯 Récupérer les utilisateurs mutuels (qui se suivent mutuellement)
 */
export async function getMutualFollows() {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  // Récupérer les followers
  const followers = await getFollowers(user.uid);
  const followerIds = followers.map(f => f.id);

  // Récupérer les following
  const following = await getFollowing(user.uid);
  const followingIds = following.map(f => f.id);

  // Trouver les mutuels (intersection)
  const mutualIds = followerIds.filter(id => followingIds.includes(id));

  // Récupérer les profils des mutuels
  const mutualProfiles = await Promise.all(
    mutualIds.map(async (id) => {
      const userRef = doc(db, 'users', id);
      const userSnap = await getDoc(userRef);
      return {
        id: userSnap.id,
        ...userSnap.data(),
      };
    })
  );

  return mutualProfiles;
}
 