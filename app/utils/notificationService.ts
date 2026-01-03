// app/utils/notificationService.ts
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig'; // Vérifiez votre chemin vers firebaseConfig

export const sendNotification = async (
  targetUserId: string, 
  type: 'like' | 'comment' | 'follow' | 'save' | 'message', 
  details: { 
    videoId?: string; 
    videoTitle?: string; 
    videoThumb?: string;
    commentText?: string; 
  } = {}
) => {
  const currentUser = auth.currentUser;
  
  // 1. Sécurité : On ne s'envoie pas de notif à soi-même
  if (!currentUser || currentUser.uid === targetUserId) return;

  try {
    await addDoc(collection(db, 'notifications'), {
      userId: targetUserId, // Celui qui REÇOIT (Le formateur)
      fromUserId: currentUser.uid, // Celui qui FAIT l'action (L'apprenant)
      fromUserName: currentUser.displayName || "Un utilisateur",
      fromUserAvatar: currentUser.photoURL || null,
      type: type,
      
      // Détails optionnels selon le type
      videoId: details.videoId || null,
      videoTitle: details.videoTitle || null,
      videoThumb: details.videoThumb || null,
      comment: details.commentText || null,
      
      read: false,
      createdAt: serverTimestamp()
    });
    console.log(`🔔 Notification '${type}' envoyée à ${targetUserId}`);
  } catch (error) {
    console.error("❌ Erreur envoi notification:", error);
  }
};