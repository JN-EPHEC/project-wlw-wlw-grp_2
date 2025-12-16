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
 * 👍 LIKER un contenu (vidéo ou post)
 */
export async function likeContent(
  contentId: string, 
  contentType: 'video' | 'post' = 'video'
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  const likeId = `${user.uid}_${contentId}`;
  const likeRef = doc(db, 'likes', likeId);
  
  // Vérifier si déjà liké
  const likeSnap = await getDoc(likeRef);
  if (likeSnap.exists()) {
    throw new Error('Déjà liké');
  }

  const batch = writeBatch(db);

  // Créer le like
  batch.set(likeRef, {
    userId: user.uid,
    contentId: contentId,
    contentType: contentType,
    createdAt: serverTimestamp(),
  });

  // Incrémenter le compteur sur le contenu
  const contentRef = doc(db, contentType === 'video' ? 'videos' : 'posts', contentId);
  batch.update(contentRef, {
    likesCount: increment(1),
  });

  // Incrémenter le compteur de l'utilisateur
  const userRef = doc(db, 'users', user.uid);
  batch.update(userRef, {
    'stats.likesCount': increment(1),
  });

  await batch.commit();

  return { success: true };
}

/**
 * 👎 UNLIKER un contenu
 */
export async function unlikeContent(
  contentId: string, 
  contentType: 'video' | 'post' = 'video'
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  const likeId = `${user.uid}_${contentId}`;
  const likeRef = doc(db, 'likes', likeId);

  // Vérifier si le like existe
  const likeSnap = await getDoc(likeRef);
  if (!likeSnap.exists()) {
    throw new Error('Like introuvable');
  }

  const batch = writeBatch(db);

  // Supprimer le like
  batch.delete(likeRef);

  // Décrémenter le compteur sur le contenu
  const contentRef = doc(db, contentType === 'video' ? 'videos' : 'posts', contentId);
  batch.update(contentRef, {
    likesCount: increment(-1),
  });

  // Décrémenter le compteur de l'utilisateur
  const userRef = doc(db, 'users', user.uid);
  batch.update(userRef, {
    'stats.likesCount': increment(-1),
  });

  await batch.commit();

  return { success: true };
}

/**
 * ❓ Vérifier si l'utilisateur a liké un contenu
 */
export async function hasLiked(contentId: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  const likeId = `${user.uid}_${contentId}`;
  const likeRef = doc(db, 'likes', likeId);
  const likeSnap = await getDoc(likeRef);

  return likeSnap.exists();
}

/**
 * 💬 COMMENTER un contenu
 */
export async function addComment(
  contentId: string,
  text: string,
  contentType: 'video' | 'post' = 'video'
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  if (!text || text.trim().length === 0) {
    throw new Error('Le commentaire ne peut pas être vide');
  }

  const commentRef = doc(collection(db, 'comments'));
  const batch = writeBatch(db);

  // Créer le commentaire
  batch.set(commentRef, {
    id: commentRef.id,
    userId: user.uid,
    contentId: contentId,
    contentType: contentType,
    text: text.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Incrémenter le compteur sur le contenu
  const contentRef = doc(db, contentType === 'video' ? 'videos' : 'posts', contentId);
  batch.update(contentRef, {
    commentsCount: increment(1),
  });

  // Incrémenter le compteur de l'utilisateur
  const userRef = doc(db, 'users', user.uid);
  batch.update(userRef, {
    'stats.commentsCount': increment(1),
  });

  await batch.commit();

  return { 
    success: true, 
    commentId: commentRef.id 
  };
}

/**
 * ✏️ MODIFIER un commentaire
 */
export async function updateComment(commentId: string, newText: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  const commentRef = doc(db, 'comments', commentId);
  const commentSnap = await getDoc(commentRef);

  if (!commentSnap.exists()) {
    throw new Error('Commentaire introuvable');
  }

  // Vérifier que l'utilisateur est bien l'auteur
  if (commentSnap.data().userId !== user.uid) {
    throw new Error('Non autorisé');
  }

  await updateDoc(commentRef, {
    text: newText.trim(),
    updatedAt: serverTimestamp(),
  });

  return { success: true };
}

/**
 * 🗑️ SUPPRIMER un commentaire
 */
export async function deleteComment(commentId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  const commentRef = doc(db, 'comments', commentId);
  const commentSnap = await getDoc(commentRef);

  if (!commentSnap.exists()) {
    throw new Error('Commentaire introuvable');
  }

  const commentData = commentSnap.data();

  // Vérifier que l'utilisateur est bien l'auteur
  if (commentData.userId !== user.uid) {
    throw new Error('Non autorisé');
  }

  const batch = writeBatch(db);

  // Supprimer le commentaire
  batch.delete(commentRef);

  // Décrémenter le compteur sur le contenu
  const contentRef = doc(
    db, 
    commentData.contentType === 'video' ? 'videos' : 'posts', 
    commentData.contentId
  );
  batch.update(contentRef, {
    commentsCount: increment(-1),
  });

  // Décrémenter le compteur de l'utilisateur
  const userRef = doc(db, 'users', user.uid);
  batch.update(userRef, {
    'stats.commentsCount': increment(-1),
  });

  await batch.commit();

  return { success: true };
}

/**
 * 📚 RÉCUPÉRER les commentaires d'un contenu
 */
export async function getComments(contentId: string, limitCount: number = 50) {
  const commentsRef = collection(db, 'comments');
  const q = query(
    commentsRef,
    where('contentId', '==', contentId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  const comments = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  return comments;
}

/**
 * 💾 SAUVEGARDER un contenu (favoris)
 */
export async function saveContent(
  contentId: string, 
  contentType: 'video' | 'post' = 'video'
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  const saveRef = doc(db, 'users', user.uid, 'saved', contentId);

  // Vérifier si déjà sauvegardé
  const saveSnap = await getDoc(saveRef);
  if (saveSnap.exists()) {
    throw new Error('Déjà sauvegardé');
  }

  const batch = writeBatch(db);

  // Créer la sauvegarde
  batch.set(saveRef, {
    contentId: contentId,
    contentType: contentType,
    savedAt: serverTimestamp(),
  });

  // Incrémenter le compteur de l'utilisateur
  const userRef = doc(db, 'users', user.uid);
  batch.update(userRef, {
    'stats.savedCount': increment(1),
  });

  await batch.commit();

  return { success: true };
}

/**
 * 🗑️ RETIRER un contenu des favoris
 */
export async function unsaveContent(contentId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  const saveRef = doc(db, 'users', user.uid, 'saved', contentId);

  // Vérifier si existe
  const saveSnap = await getDoc(saveRef);
  if (!saveSnap.exists()) {
    throw new Error('Sauvegarde introuvable');
  }

  const batch = writeBatch(db);

  // Supprimer la sauvegarde
  batch.delete(saveRef);

  // Décrémenter le compteur de l'utilisateur
  const userRef = doc(db, 'users', user.uid);
  batch.update(userRef, {
    'stats.savedCount': increment(-1),
  });

  await batch.commit();

  return { success: true };
}

/**
 * ❓ Vérifier si l'utilisateur a sauvegardé un contenu
 */
export async function hasSaved(contentId: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  const saveRef = doc(db, 'users', user.uid, 'saved', contentId);
  const saveSnap = await getDoc(saveRef);

  return saveSnap.exists();
}

/**
 * 📚 RÉCUPÉRER les contenus sauvegardés
 */
export async function getSavedContent() {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  const savedRef = collection(db, 'users', user.uid, 'saved');
  const q = query(savedRef, orderBy('savedAt', 'desc'));

  const querySnapshot = await getDocs(q);
  const saved = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  return saved;
}

/**
 * 📤 PARTAGER un contenu
 */
export async function shareContent(
  contentId: string,
  contentType: 'video' | 'post' = 'video',
  platform?: 'facebook' | 'twitter' | 'whatsapp' | 'copy'
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  const shareRef = doc(collection(db, 'shares'));
  const batch = writeBatch(db);

  // Enregistrer le partage
  batch.set(shareRef, {
    userId: user.uid,
    contentId: contentId,
    contentType: contentType,
    platform: platform || 'unknown',
    sharedAt: serverTimestamp(),
  });

  // Incrémenter le compteur sur le contenu
  const contentRef = doc(db, contentType === 'video' ? 'videos' : 'posts', contentId);
  batch.update(contentRef, {
    sharesCount: increment(1),
  });

  // Incrémenter le compteur de l'utilisateur
  const userRef = doc(db, 'users', user.uid);
  batch.update(userRef, {
    'stats.sharesCount': increment(1),
  });

  await batch.commit();

  return { 
    success: true,
    shareId: shareRef.id 
  };
}

