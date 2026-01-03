import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig'; 

interface NotificationData {
  videoId?: string;
  videoTitle?: string;
  commentText?: string;
  senderName: string; 
  senderId: string;   
}

export const sendNotification = async (
  targetUserId: string,
  type: 'like' | 'comment' | 'message' | 'follow' | 'save',
  data: NotificationData
) => {
  // Sécurité : ne pas s'envoyer de notification à soi-même
  if (!targetUserId || targetUserId === data.senderId) return;

  try {
    await addDoc(collection(db, 'notifications'), {
      userId: targetUserId,
      type,
      senderId: data.senderId,
      senderName: data.senderName,
      videoId: data.videoId || null,
      videoTitle: data.videoTitle || null,
      message: type === 'comment' ? `${data.senderName} a commenté : ${data.commentText}` : 
               type === 'like' ? `${data.senderName} a aimé votre vidéo` : 
               type === 'save' ? `${data.senderName} a enregistré votre vidéo` :
               `${data.senderName} vous a envoyé un message`,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Erreur envoi notification:", error);
  }
};