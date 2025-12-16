import { auth, db, storage } from '../../firebaseConfig';
import { 
  collection,
  doc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  UploadTask
} from 'firebase/storage';

export interface VideoData {
  title: string;
  description?: string;
  category: string;
  tags?: string[];
  thumbnail?: string;
  duration?: number;
  isPublic: boolean;
}

export interface VideoUploadProgress {
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

/**
 * 🎥 Uploader une vidéo avec progression
 */
export async function uploadVideo(
  videoUri: string,
  videoData: VideoData,
  onProgress?: (progress: VideoUploadProgress) => void
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Utilisateur non connecté');
  }

  try {
    // 1. Convertir l'URI en Blob
    const response = await fetch(videoUri);
    const blob = await response.blob();

    // 2. Créer une référence unique
    const timestamp = Date.now();
    const videoId = `${user.uid}_${timestamp}`;
    const videoRef = ref(storage, `videos/${user.uid}/${videoId}.mp4`);

    // 3. Upload avec progression
    const uploadTask: UploadTask = uploadBytesResumable(videoRef, blob);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.({
            progress,
            status: 'uploading',
          });
        },
        (error) => {
          onProgress?.({
            progress: 0,
            status: 'error',
            error: error.message,
          });
          reject(error);
        },
        async () => {
          // Upload terminé
          onProgress?.({
            progress: 100,
            status: 'processing',
          });

          // 4. Obtenir l'URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // 5. Créer le document Firestore
          const videoDocRef = doc(db, 'videos', videoId);
          await setDoc(videoDocRef, {
            id: videoId,
            userId: user.uid,
            videoUrl: downloadURL,
            title: videoData.title,
            description: videoData.description || '',
            category: videoData.category,
            tags: videoData.tags || [],
            thumbnail: videoData.thumbnail || null,
            duration: videoData.duration || 0,
            isPublic: videoData.isPublic,
            
            // Stats
            viewsCount: 0,
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
            
            // Métadonnées
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          // 6. Mettre à jour le compteur de vidéos de l'utilisateur
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            'stats.videosCount': increment(1),
          });

          onProgress?.({
            progress: 100,
            status: 'complete',
          });

          resolve(videoId);
        }
      );
    });
  } catch (error) {
    console.error('Erreur upload vidéo:', error);
    throw error;
  }
}

/**
 * 🖼️ Uploader une miniature (thumbnail)
 */
export async function uploadThumbnail(imageUri: string, videoId: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Utilisateur non connecté');
  }

  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();

    const thumbnailRef = ref(storage, `thumbnails/${user.uid}/${videoId}.jpg`);
    await uploadBytesResumable(thumbnailRef, blob);

    const downloadURL = await getDownloadURL(thumbnailRef);
    return downloadURL;
  } catch (error) {
    console.error('Erreur upload miniature:', error);
    throw error;
  }
}

/**
 * ✏️ Modifier une vidéo
 */
export async function updateVideo(videoId: string, updates: Partial<VideoData>) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Utilisateur non connecté');
  }

  const videoRef = doc(db, 'videos', videoId);
  const videoSnap = await getDoc(videoRef);

  if (!videoSnap.exists()) {
    throw new Error('Vidéo introuvable');
  }

  // Vérifier que l'utilisateur est bien le propriétaire
  if (videoSnap.data().userId !== user.uid) {
    throw new Error('Non autorisé');
  }

  await updateDoc(videoRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });

  return { success: true };
}

/**
 * 🗑️ Supprimer une vidéo
 */
export async function deleteVideo(videoId: string) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Utilisateur non connecté');
  }

  const videoRef = doc(db, 'videos', videoId);
  const videoSnap = await getDoc(videoRef);

  if (!videoSnap.exists()) {
    throw new Error('Vidéo introuvable');
  }

  const videoData = videoSnap.data();

  // Vérifier que l'utilisateur est bien le propriétaire
  if (videoData.userId !== user.uid) {
    throw new Error('Non autorisé');
  }

  // 1. Supprimer la vidéo du Storage
  try {
    const videoStorageRef = ref(storage, videoData.videoUrl);
    await deleteObject(videoStorageRef);
  } catch (error) {
    console.warn('Impossible de supprimer la vidéo du storage:', error);
  }

  // 2. Supprimer la miniature si elle existe
  if (videoData.thumbnail) {
    try {
      const thumbnailRef = ref(storage, videoData.thumbnail);
      await deleteObject(thumbnailRef);
    } catch (error) {
      console.warn('Impossible de supprimer la miniature:', error);
    }
  }

  // 3. Supprimer le document Firestore
  await deleteDoc(videoRef);

  // 4. Décrémenter le compteur de vidéos
  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, {
    'stats.videosCount': increment(-1),
  });

  return { success: true };
}

/**
 * 📺 Récupérer une vidéo
 */
export async function getVideo(videoId: string) {
  const videoRef = doc(db, 'videos', videoId);
  const videoSnap = await getDoc(videoRef);

  if (!videoSnap.exists()) {
    throw new Error('Vidéo introuvable');
  }

  return {
    id: videoSnap.id,
    ...videoSnap.data(),
  };
}

/**
 * 📚 Récupérer toutes les vidéos d'un utilisateur
 */
export async function getUserVideos(userId: string) {
  const videosRef = collection(db, 'videos');
  const q = query(
    videosRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  const videos = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  return videos;
}

/**
 * 🔥 Récupérer les vidéos publiques (feed)
 */
export async function getPublicVideos(limitCount: number = 20) {
  const videosRef = collection(db, 'videos');
  const q = query(
    videosRef,
    where('isPublic', '==', true),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  const videos = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  return videos;
}

/**
 * 👁️ Incrémenter les vues d'une vidéo
 */
export async function incrementVideoViews(videoId: string) {
  const videoRef = doc(db, 'videos', videoId);
  
  await updateDoc(videoRef, {
    viewsCount: increment(1),
  });

  return { success: true };
}

/**
 * 🔍 Rechercher des vidéos par catégorie
 */
export async function getVideosByCategory(category: string, limitCount: number = 20) {
  const videosRef = collection(db, 'videos');
  const q = query(
    videosRef,
    where('category', '==', category),
    where('isPublic', '==', true),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  const videos = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  return videos;
}

