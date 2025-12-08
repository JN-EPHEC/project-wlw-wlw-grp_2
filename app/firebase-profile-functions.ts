import { getAuth } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getFirestore, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

// ==========================================
// 🔥 FONCTIONS PROFIL UTILISATEUR
// ==========================================

/**
 * Sauvegarder ou mettre à jour le profil utilisateur
 */
export async function saveUserProfile(profileData: {
    username: string;
    bio: string;
    profileEmoji: string;
    profileImage: string | null;
}) {
    try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) {
            throw new Error('Utilisateur non connecté');
        }

        const db = getFirestore();
        const userDocRef = doc(db, 'users', user.uid);

        // Vérifier si le document existe
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            // Mettre à jour le profil existant
            await updateDoc(userDocRef, {
                username: profileData.username,
                bio: profileData.bio,
                profileEmoji: profileData.profileEmoji,
                profileImage: profileData.profileImage,
                updatedAt: serverTimestamp(),
            });
        } else {
            // Créer un nouveau profil
            await setDoc(userDocRef, {
                userId: user.uid,
                email: user.email,
                username: profileData.username,
                bio: profileData.bio,
                profileEmoji: profileData.profileEmoji,
                profileImage: profileData.profileImage,
                role: 'learner',
                stats: {
                    likesCount: 0,
                    followersCount: 0,
                    followingCount: 0,
                    savedCount: 0,
                },
                progressData: {
                    level: 1,
                    currentXP: 0,
                    nextLevelXP: 100,
                    videosWatched: 0,
                    hoursStudied: 0,
                    streakDays: 0,
                },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        }

        console.log('✅ Profil sauvegardé avec succès');
        return { success: true };
    } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde du profil:', error);
        throw error;
    }
}

/**
 * Récupérer le profil utilisateur
 */
export async function getUserProfile() {
    try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) {
            throw new Error('Utilisateur non connecté');
        }

        const db = getFirestore();
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            return userDoc.data();
        } else {
            return null;
        }
    } catch (error) {
        console.error('❌ Erreur lors de la récupération du profil:', error);
        throw error;
    }
}

// ==========================================
// 🔥 FONCTIONS FAVORITES
// ==========================================

/**
 * Ajouter une vidéo aux favoris
 */
export async function addToFavorites(video: {
    id: string;
    title: string;
    subtitle: string;
    videoUrl?: string;
    thumbnailUrl?: string;
}) {
    try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) throw new Error('Utilisateur non connecté');

        const db = getFirestore();
        const favRef = doc(db, 'users', user.uid, 'favorites', video.id);

        await setDoc(favRef, {
            ...video,
            addedAt: serverTimestamp(),
        });

        // Mettre à jour le compteur
        await updateUserStats(user.uid, 'savedCount', 1);

        console.log('✅ Vidéo ajoutée aux favoris');
        return { success: true };
    } catch (error) {
        console.error('❌ Erreur ajout favoris:', error);
        throw error;
    }
}

/**
 * Supprimer une vidéo des favoris
 */
export async function removeFromFavorites(videoId: string) {
    try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) throw new Error('Utilisateur non connecté');

        const db = getFirestore();
        const favRef = doc(db, 'users', user.uid, 'favorites', videoId);

        await deleteDoc(favRef);

        // Mettre à jour le compteur
        await updateUserStats(user.uid, 'savedCount', -1);

        console.log('✅ Vidéo supprimée des favoris');
        return { success: true };
    } catch (error) {
        console.error('❌ Erreur suppression favoris:', error);
        throw error;
    }
}

/**
 * Récupérer tous les favoris
 */
export async function getFavorites() {
    try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) throw new Error('Utilisateur non connecté');

        const db = getFirestore();
        const { getDocs, collection: firestoreCollection, query, orderBy } = await import('firebase/firestore');
        
        const favoritesRef = firestoreCollection(db, 'users', user.uid, 'favorites');
        const q = query(favoritesRef, orderBy('addedAt', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('❌ Erreur récupération favoris:', error);
        throw error;
    }
}

// ==========================================
// 🔥 FONCTIONS OBJECTIFS
// ==========================================

/**
 * Ajouter un objectif
 */
export async function addGoal(goal: {
    title: string;
    emoji: string;
    color: string;
    target: number;
}) {
    try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) throw new Error('Utilisateur non connecté');

        const db = getFirestore();
        const goalsRef = collection(db, 'users', user.uid, 'goals');

        // Calculer la semaine actuelle
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        await addDoc(goalsRef, {
            title: goal.title,
            emoji: goal.emoji,
            color: goal.color,
            target: goal.target,
            current: 0,
            weekStart: weekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            createdAt: serverTimestamp(),
        });

        console.log('✅ Objectif ajouté');
        return { success: true };
    } catch (error) {
        console.error('❌ Erreur ajout objectif:', error);
        throw error;
    }
}

/**
 * Mettre à jour la progression d'un objectif
 */
export async function updateGoalProgress(goalId: string, newCurrent: number) {
    try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) throw new Error('Utilisateur non connecté');

        const db = getFirestore();
        const goalRef = doc(db, 'users', user.uid, 'goals', goalId);

        await updateDoc(goalRef, {
            current: newCurrent,
            updatedAt: serverTimestamp(),
        });

        console.log('✅ Progression mise à jour');
        return { success: true };
    } catch (error) {
        console.error('❌ Erreur mise à jour objectif:', error);
        throw error;
    }
}

// ==========================================
// 🔥 FONCTIONS HELPER
// ==========================================

/**
 * Mettre à jour les statistiques utilisateur
 */
async function updateUserStats(userId: string, stat: string, increment: number) {
    try {
        const db = getFirestore();
        const { increment: firestoreIncrement } = await import('firebase/firestore');
        const userRef = doc(db, 'users', userId);

        await updateDoc(userRef, {
            [`stats.${stat}`]: firestoreIncrement(increment),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('❌ Erreur mise à jour stats:', error);
    }
}

/**
 * Incrémenter l'XP de l'utilisateur
 */
export async function addXP(amount: number) {
    try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) throw new Error('Utilisateur non connecté');

        const db = getFirestore();
        const { increment: firestoreIncrement } = await import('firebase/firestore');
        const userRef = doc(db, 'users', user.uid);

        await updateDoc(userRef, {
            'progressData.currentXP': firestoreIncrement(amount),
            updatedAt: serverTimestamp(),
        });

        console.log(`✅ +${amount} XP ajoutés`);
        return { success: true };
    } catch (error) {
        console.error('❌ Erreur ajout XP:', error);
        throw error;
    }
}