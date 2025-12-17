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

// ==========================================
// 🛠️ INTERFACES
// ==========================================

export interface UserRegistrationData {
  username: string;
  firstName: string; 
  lastName: string;
  birthDate?: string;
  bio?: string;
  profileEmoji?: string;
  interests: string[];
  age?: number; 
  location?: string;
}

export interface UserProfileUpdate {
  username?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  bio?: string;
  profileEmoji?: string;
  profileImage?: string | null;
  interests?: string[];
  age?: number;
  location?: string;
}

export interface UserProfile {
  id: string;
  uid: string;
  username: string;
  email?: string;
  bio?: string;
  profileEmoji?: string;
  profileImage?: string | null;
  role?: string;
  isVerified?: boolean;
  stats?: {
    likesCount: number;
    followersCount: number;
    followingCount: number;
    savedCount: number;
    videosCount?: number;
    commentsCount?: number;
    sharesCount?: number;
  };
  progressData?: {
    level: number;
    currentXP: number;
    nextLevelXP: number;
    videosWatched?: number;
    hoursStudied?: number;
    streakDays?: number;
  };
  interests?: string[];
}

// ==========================================
// 🔥 FONCTION DE CRÉATION (MODIFIÉE)
// ==========================================

/**
 * 📝 Créer le profil utilisateur lors de l'inscription
 * @param data Les données du formulaire
 * @param collectionName La collection cible ('users' ou 'formateurs')
 */
export async function createUserProfile(data: UserRegistrationData, collectionName: 'users' | 'formateurs' = 'users') {
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('ERREUR CRITIQUE : Utilisateur non connecté au moment de la création du profil.');
  }

  // 🔴 C'EST ICI QUE SE FAIT LA SÉPARATION DES COLLECTIONS
  const userRef = doc(db, collectionName, user.uid);

  console.log(`🔥 Tentative d'écriture Firestore dans la collection '${collectionName}' pour :`, user.uid);

  const safeData = {
    uid: user.uid,
    email: user.email || "", 
    username: data.username || "User",
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    birthDate: data.birthDate || null, 
    bio: data.bio || "",
    profileEmoji: data.profileEmoji || "👤",
    profileImage: null,
    
    // On enregistre le rôle explicitement
    role: collectionName === 'formateurs' ? 'creator' : 'learner',
    
    age: data.age !== undefined ? data.age : null, 
    location: data.location !== undefined ? data.location : null,
    
    interests: data.interests || [],
    
    stats: {
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      savedCount: 0,
      followersCount: 0,
      followingCount: 0,
      videosCount: 0,
    },
    
    progressData: {
      level: 1,
      currentXP: 0,
      nextLevelXP: 100,
      videosWatched: 0,
      hoursStudied: 0,
      streakDays: 0,
    },

    isVerified: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(userRef, safeData);

  console.log("✅ Écriture Firestore réussie !");
  return { success: true };
}

// ... Le reste des fonctions (uploadProfileImage, etc.) restent identiques ...
// N'oubliez pas d'inclure les fonctions de récupération (getUserProfile) qui cherchent dans les deux collections comme vu précédemment.

export async function uploadProfileImage(imageUri: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Utilisateur non connecté');
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const timestamp = Date.now();
    const imageRef = ref(storage, `profile-images/${user.uid}/${timestamp}.jpg`);
    await uploadBytes(imageRef, blob);
    return await getDownloadURL(imageRef);
  } catch (error) {
    console.error('Erreur upload:', error);
    throw error;
  }
}

export async function deleteOldProfileImage(imageUrl: string) {
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (error) {
    console.warn('Impossible de supprimer l\'ancienne photo:', error);
  }
}

export async function updateUserProfile(updates: UserProfileUpdate) {
  const user = auth.currentUser;
  if (!user) throw new Error('Utilisateur non connecté');
  
  // On tente d'abord 'users', sinon 'formateurs'
  const userRef = doc(db, 'users', user.uid); 
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
      await updateDoc(userRef, { ...updates, updatedAt: serverTimestamp() });
  } else {
      const formateurRef = doc(db, 'formateurs', user.uid);
      await updateDoc(formateurRef, { ...updates, updatedAt: serverTimestamp() });
  }
  return { success: true };
}

export async function updateProfileImage(newImageUri: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Utilisateur non connecté');
  
  let docRef = doc(db, 'users', user.uid);
  let docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
      docRef = doc(db, 'formateurs', user.uid);
      docSnap = await getDoc(docRef);
  }
  
  const oldImageUrl = docSnap.data()?.profileImage;
  if (oldImageUrl) await deleteOldProfileImage(oldImageUrl);
  
  const newImageUrl = await uploadProfileImage(newImageUri);
  await updateDoc(docRef, { profileImage: newImageUrl, updatedAt: serverTimestamp() });
  
  return { success: true, imageUrl: newImageUrl };
}

export async function getUserProfile(userId?: string): Promise<UserProfile> {
  const user = auth.currentUser;
  const targetUserId = userId || user?.uid;
  if (!targetUserId) throw new Error('Aucun utilisateur spécifié');
  
  // Cherche dans 'users'
  const userRef = doc(db, 'users', targetUserId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return { id: userSnap.id, ...userSnap.data() } as UserProfile;
  }

  // Sinon cherche dans 'formateurs'
  const formateurRef = doc(db, 'formateurs', targetUserId);
  const formateurSnap = await getDoc(formateurRef);
  if (formateurSnap.exists()) {
    return { id: formateurSnap.id, ...formateurSnap.data() } as UserProfile;
  }
  
  throw new Error('Profil introuvable');
}

export async function removeProfileImage() {
  const user = auth.currentUser;
  if (!user) throw new Error('Utilisateur non connecté');
  
  let docRef = doc(db, 'users', user.uid);
  let docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
      docRef = doc(db, 'formateurs', user.uid);
      docSnap = await getDoc(docRef);
  }
  
  const currentImageUrl = docSnap.data()?.profileImage;
  if (currentImageUrl) await deleteOldProfileImage(currentImageUrl);
  
  await updateDoc(docRef, { profileImage: null, updatedAt: serverTimestamp() });
  return { success: true };
}