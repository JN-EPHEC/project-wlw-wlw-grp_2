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
  firstName: string; 
  lastName: string;
  birthDate?: string;
  bio?: string;
  profileEmoji?: string;
  interests: string[];
  age?: number; // Optionnel
  location?: string; // Optionnel
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

/**
 * 📝 Créer le profil utilisateur lors de l'inscription
 */
export async function createUserProfile(data: UserRegistrationData) {
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('ERREUR CRITIQUE : Utilisateur non connecté au moment de la création du profil.');
  }

  const userRef = doc(db, 'users', user.uid);

  console.log("🔥 Tentative d'écriture Firestore pour :", user.uid);

  // 🛡️ NETTOYAGE DES DONNÉES (Sanitization)
  // On remplace toutes les valeurs potentiellement 'undefined' par 'null'
  // car Firestore refuse 'undefined'.
  const safeData = {
    uid: user.uid,
    email: user.email || "", 
    username: data.username || "User",
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    // Si birthDate est undefined, on met null
    birthDate: data.birthDate || null, 
    bio: data.bio || "",
    profileEmoji: data.profileEmoji || "👤",
    profileImage: null,
    role: "learner",
    
    // ⚠️ C'est ici que ça plantait avant :
    age: data.age !== undefined ? data.age : null, 
    location: data.location !== undefined ? data.location : null,
    
    interests: data.interests || [],
    
    // Stats initiales
    stats: {
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      savedCount: 0,
      followersCount: 0,
      followingCount: 0,
      videosCount: 0,
    },
    
    // Progression initiale
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

  // Écriture dans la base de données avec les données nettoyées
  await setDoc(userRef, safeData);

  console.log("✅ Écriture Firestore réussie !");
  return { success: true };
}

// ... (Le reste des fonctions uploadProfileImage, etc. reste inchangé, tu peux les garder telles quelles)
/**
 * 📸 Uploader une photo de profil
 */
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
  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, { ...updates, updatedAt: serverTimestamp() });
  return { success: true };
}

export async function updateProfileImage(newImageUri: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Utilisateur non connecté');
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  const oldImageUrl = userSnap.data()?.profileImage;
  if (oldImageUrl) await deleteOldProfileImage(oldImageUrl);
  const newImageUrl = await uploadProfileImage(newImageUri);
  await updateDoc(userRef, { profileImage: newImageUrl, updatedAt: serverTimestamp() });
  return { success: true, imageUrl: newImageUrl };
}

export async function getUserProfile(userId?: string) {
  const user = auth.currentUser;
  const targetUserId = userId || user?.uid;
  if (!targetUserId) throw new Error('Aucun utilisateur spécifié');
  const userRef = doc(db, 'users', targetUserId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('Profil introuvable');
  return { id: userSnap.id, ...userSnap.data() };
}

export async function removeProfileImage() {
  const user = auth.currentUser;
  if (!user) throw new Error('Utilisateur non connecté');
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  const currentImageUrl = userSnap.data()?.profileImage;
  if (currentImageUrl) await deleteOldProfileImage(currentImageUrl);
  await updateDoc(userRef, { profileImage: null, updatedAt: serverTimestamp() });
  return { success: true };
}