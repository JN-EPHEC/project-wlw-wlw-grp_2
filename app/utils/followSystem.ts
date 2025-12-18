import { auth, db } from '../../firebaseConfig';
import { 
  doc, 
  writeBatch,
  increment,
  serverTimestamp 
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

  // Références
  const userRef = doc(db, 'users', user.uid);
  const targetRef = doc(db, 'users', targetUserId);
  
  // Sous-collections pour suivre les relations exactes
  const currentUserFollowingRef = doc(db, 'users', user.uid, 'following', targetUserId);
  const targetUserFollowersRef = doc(db, 'users', targetUserId, 'followers', user.uid);

  try {
    const batch = writeBatch(db);

    // 1. Ajouter à la liste "following" de l'utilisateur courant
    batch.set(currentUserFollowingRef, {
      followedAt: serverTimestamp(),
      userId: targetUserId
    });

    // 2. Ajouter à la liste "followers" de la cible
    batch.set(targetUserFollowersRef, {
      followedAt: serverTimestamp(),
      userId: user.uid
    });

    // 3. Mettre à jour les compteurs (stats)
    batch.update(userRef, { 'stats.followingCount': increment(1) });
    batch.update(targetRef, { 'stats.followersCount': increment(1) });

    await batch.commit();
    console.log('✅ Follow réussi');
    return { success: true };

  } catch (error) {
    console.error('Erreur follow:', error);
    throw error;
  }
}

/**
 * ➖ NE PLUS SUIVRE un utilisateur
 */
export async function unfollowUser(targetUserId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  const userRef = doc(db, 'users', user.uid);
  const targetRef = doc(db, 'users', targetUserId);
  
  const currentUserFollowingRef = doc(db, 'users', user.uid, 'following', targetUserId);
  const targetUserFollowersRef = doc(db, 'users', targetUserId, 'followers', user.uid);

  try {
    const batch = writeBatch(db);

    // Supprimer les documents de relation
    batch.delete(currentUserFollowingRef);
    batch.delete(targetUserFollowersRef);

    // Mettre à jour les compteurs
    batch.update(userRef, { 'stats.followingCount': increment(-1) });
    batch.update(targetRef, { 'stats.followersCount': increment(-1) });

    await batch.commit();
    console.log('✅ Unfollow réussi');
    return { success: true };

  } catch (error) {
    console.error('Erreur unfollow:', error);
    throw error;
  }
}