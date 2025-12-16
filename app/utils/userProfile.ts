import { auth, db, storage } from '../../firebaseConfig';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';

export interface UserRegistrationData {
  username: string;
  bio?: string;
  profileEmoji?: string;
  interests: string[];
  age?: number;
  location?: string;
}

export interface UserProfileUpdate {
  username?: string;
  bio?: string;
  profileEmoji?: string;
  profileImage?: string | null;
  interests?: string[];
  age?: number;
  location?: string;
}

/**
 * 📝 Créer le profil utilisateur lors de l'inscription
 */
export async function createUserProfile(data: UserRegistrationData) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Utilisateur non connecté');
  }

  const userRef = doc(db, 'users', user.uid);

  await setDoc(userRef, {
    uid: user.uid,
    email: user.email ?? '',
    username: data.username,
    bio: data.bio ?? '',
    profileEmoji: data.profileEmoji ?? '👤',
    profileImage: null,
    interests: data.interests,
    age: data.age,
    location: data.location,
    
    // Stats sociales
    stats: {
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      savedCount: 0,
      followersCount: 0,
      followingCount: 0,
      videosCount: 0,
    },
    
    // Progression
    progressData: {
      level: 1,
      currentXP: 0,
      nextLevelXP: 100,
      videosWatched: 0,
      hoursStudied: 0,
      streakDays: 0,
    },
    
    // Métadonnées
    role: 'learner',
    isVerified: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { success: true, userId: user.uid };
}

/**
 * 📸 Uploader une photo de profil
 */
export async function uploadProfileImage(imageUri: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Utilisateur non connecté');
  }

  try {
    // Convertir l'URI en Blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Créer une référence unique
    const timestamp = Date.now();
    const imageRef = ref(storage, `profile-images/${user.uid}/${timestamp}.jpg`);

    // Upload
    await uploadBytes(imageRef, blob);

    // Obtenir l'URL de téléchargement
    const downloadURL = await getDownloadURL(imageRef);

    return downloadURL;
  } catch (error) {
    console.error('Erreur upload photo de profil:', error);
    throw new Error('Échec de l\'upload de la photo');
  }
}

/**
 * 🗑️ Supprimer l'ancienne photo de profil
 */
export async function deleteOldProfileImage(imageUrl: string) {
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (error) {
    console.warn('Impossible de supprimer l\'ancienne photo:', error);
  }
}

/**
 * ✏️ Mettre à jour le profil utilisateur
 */
export async function updateUserProfile(updates: UserProfileUpdate) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Utilisateur non connecté');
  }

  const userRef = doc(db, 'users', user.uid);

  await updateDoc(userRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });

  return { success: true };
}

/**
 * 🔄 Mettre à jour la photo de profil
 */
export async function updateProfileImage(newImageUri: string) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Utilisateur non connecté');
  }

  // 1. Récupérer l'ancienne URL
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  const oldImageUrl = userSnap.data()?.profileImage;

  // 2. Supprimer l'ancienne photo si elle existe
  if (oldImageUrl) {
    await deleteOldProfileImage(oldImageUrl);
  }

  // 3. Uploader la nouvelle photo
  const newImageUrl = await uploadProfileImage(newImageUri);

  // 4. Mettre à jour Firestore
  await updateDoc(userRef, {
    profileImage: newImageUrl,
    updatedAt: serverTimestamp(),
  });

  return { success: true, imageUrl: newImageUrl };
}

/**
 * 📖 Récupérer le profil utilisateur
 */
export async function getUserProfile(userId?: string) {
  const user = auth.currentUser;
  const targetUserId = userId || user?.uid;
  
  if (!targetUserId) {
    throw new Error('Aucun utilisateur spécifié');
  }

  const userRef = doc(db, 'users', targetUserId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error('Profil introuvable');
  }

  return {
    id: userSnap.id,
    ...userSnap.data(),
  };
}

/**
 * 🗑️ Supprimer la photo de profil
 */
export async function removeProfileImage() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Utilisateur non connecté');
  }

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  const currentImageUrl = userSnap.data()?.profileImage;

  if (currentImageUrl) {
    await deleteOldProfileImage(currentImageUrl);
  }

  await updateDoc(userRef, {
    profileImage: null,
    updatedAt: serverTimestamp(),
  });

  return { success: true };
}
