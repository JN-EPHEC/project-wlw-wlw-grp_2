import { addDoc, collection, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';

// 📧 TYPES DE NOTIFICATIONS
export type NotificationType = 
  | 'like'
  | 'comment'
  | 'comment_reply'
  | 'comment_like'
  | 'follow'
  | 'save'
  | 'view'
  | 'badge'
  | 'video_share'
  | 'message';

interface NotificationData {
  userId: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  type: NotificationType;
  videoId?: string;
  videoTitle?: string;
  videoThumb?: string;
  comment?: string;
  badge?: string;
  read: boolean;
  createdAt: any;
}

/**
 * ✅ CRÉER UNE NOTIFICATION
 */
async function createNotification(data: Partial<NotificationData>) {
  try {
    const user = auth.currentUser;
    if (!user) return;

    if (data.userId === data.fromUserId) {
      return;
    }

    await addDoc(collection(db, 'notifications'), {
      ...data,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('❌ Erreur création notification:', error);
  }
}

/**
 * LIKE DE VIDÉO
 */
export async function notifyVideoLike(videoId: string, videoCreatorId: string, videoTitle: string) {
  const user = auth.currentUser;
  if (!user) return;

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const userData = userDoc.data();

  await createNotification({
    userId: videoCreatorId,
    fromUserId: user.uid,
    fromUserName: `${userData?.prenom || ''} ${userData?.nom || ''}`.trim() || userData?.displayName || 'Utilisateur',
    fromUserAvatar: userData?.photoURL,
    type: 'like',
    videoId,
    videoTitle
  });
}

/**
 * 💬 NOTIFICATION: COMMENTAIRE SUR VIDÉO
 */
export async function notifyVideoComment(
  videoId: string, 
  videoCreatorId: string, 
  videoTitle: string, 
  commentText: string
) {
  const user = auth.currentUser;
  if (!user) return;

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const userData = userDoc.data();

  await createNotification({
    userId: videoCreatorId,
    fromUserId: user.uid,
    fromUserName: `${userData?.prenom || ''} ${userData?.nom || ''}`.trim() || userData?.displayName || 'Utilisateur',
    fromUserAvatar: userData?.photoURL,
    type: 'comment',
    videoId,
    videoTitle,
    comment: commentText.substring(0, 100)
  });
}

/**
 * 💬 NOTIFICATION: RÉPONSE À COMMENTAIRE
 */
export async function notifyCommentReply(
  replyToUserId: string,
  videoId: string,
  videoTitle: string,
  replyText: string
) {
  const user = auth.currentUser;
  if (!user) return;

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const userData = userDoc.data();

  await createNotification({
    userId: replyToUserId,
    fromUserId: user.uid,
    fromUserName: `${userData?.prenom || ''} ${userData?.nom || ''}`.trim() || userData?.displayName || 'Utilisateur',
    fromUserAvatar: userData?.photoURL,
    type: 'comment_reply',
    videoId,
    videoTitle,
    comment: replyText.substring(0, 100)
  });
}

/**
 * ❤️ NOTIFICATION: LIKE DE COMMENTAIRE
 */
export async function notifyCommentLike(
  commentOwnerId: string,
  videoId: string,
  videoTitle: string,
  commentText: string
) {
  const user = auth.currentUser;
  if (!user) return;

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const userData = userDoc.data();

  await createNotification({
    userId: commentOwnerId,
    fromUserId: user.uid,
    fromUserName: `${userData?.prenom || ''} ${userData?.nom || ''}`.trim() || userData?.displayName || 'Utilisateur',
    fromUserAvatar: userData?.photoURL,
    type: 'comment_like',
    videoId,
    videoTitle,
    comment: commentText.substring(0, 100)
  });
}

/**
 * 👤 NOTIFICATION: NOUVEL ABONNEMENT
 */
export async function notifyFollow(targetUserId: string) {
  const user = auth.currentUser;
  if (!user) return;

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const userData = userDoc.data();

  await createNotification({
    userId: targetUserId,
    fromUserId: user.uid,
    fromUserName: `${userData?.prenom || ''} ${userData?.nom || ''}`.trim() || userData?.displayName || 'Utilisateur',
    fromUserAvatar: userData?.photoURL,
    type: 'follow'
  });
}

/**
 * 🔖 NOTIFICATION: SAUVEGARDE DE VIDÉO
 */
export async function notifyVideoSave(videoId: string, videoCreatorId: string, videoTitle: string) {
  const user = auth.currentUser;
  if (!user) return;

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const userData = userDoc.data();

  await createNotification({
    userId: videoCreatorId,
    fromUserId: user.uid,
    fromUserName: `${userData?.prenom || ''} ${userData?.nom || ''}`.trim() || userData?.displayName || 'Utilisateur',
    fromUserAvatar: userData?.photoURL,
    type: 'save',
    videoId,
    videoTitle
  });
}

/**
 * 🎖️ NOTIFICATION: NOUVEAU BADGE
 */
export async function notifyNewBadge(userId: string, badgeType: 'expert' | 'pro') {
  await createNotification({
    userId,
    fromUserId: 'system',
    fromUserName: 'SwipeSkills',
    fromUserAvatar: 'https://ui-avatars.com/api/?name=SwipeSkills&background=9333ea&color=fff',
    type: 'badge',
    badge: badgeType === 'expert' ? 'Expert' : 'Pro'
  });
}

/**
 * 📤 NOTIFICATION: PARTAGE DE VIDÉO
 */
export async function notifyVideoShare(
  targetUserId: string,
  videoId: string,
  videoTitle: string
) {
  const user = auth.currentUser;
  if (!user) return;

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const userData = userDoc.data();

  await createNotification({
    userId: targetUserId,
    fromUserId: user.uid,
    fromUserName: `${userData?.prenom || ''} ${userData?.nom || ''}`.trim() || userData?.displayName || 'Utilisateur',
    fromUserAvatar: userData?.photoURL,
    type: 'video_share',
    videoId,
    videoTitle
  });
}

/**
 * 💌 NOTIFICATION: NOUVEAU MESSAGE
 */
export async function notifyNewMessage(targetUserId: string, messagePreview: string) {
  const user = auth.currentUser;
  if (!user) return;

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const userData = userDoc.data();

  await createNotification({
    userId: targetUserId,
    fromUserId: user.uid,
    fromUserName: `${userData?.prenom || ''} ${userData?.nom || ''}`.trim() || userData?.displayName || 'Utilisateur',
    fromUserAvatar: userData?.photoURL,
    type: 'message',
    comment: messagePreview.substring(0, 100)
  });
}

/**
 * GENERIC SEND NOTIFICATION
 *
 * Convenience wrapper used by callers that pass a target user, a type and an optional payload.
 * It merges provided payload fields with the expected notification structure and delegates
 * to createNotification so we keep a single persistence path.
 */
export async function sendNotification(targetUserId: string, type: NotificationType, payload?: any) {
  const user = auth.currentUser;
  if (!user) return;

  // Prevent sending a notification to oneself (support both 'senderId' and 'fromUserId')
  if ((payload?.fromUserId && payload.fromUserId === targetUserId) || (payload?.senderId && payload.senderId === targetUserId)) return;

  // Build base object - prefer explicit values from payload, otherwise derive from auth user when possible
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const userData = userDoc.data();

  const notification: Partial<NotificationData> = {
    userId: targetUserId,
    fromUserId: payload?.fromUserId || payload?.senderId || user.uid,
    fromUserName: payload?.fromUserName || payload?.senderName || `${userData?.prenom || ''} ${userData?.nom || ''}`.trim() || userData?.displayName || 'Utilisateur',
    fromUserAvatar: payload?.fromUserAvatar || userData?.photoURL,
    type,
    videoId: payload?.videoId,
    videoTitle: payload?.videoTitle,
    videoThumb: payload?.videoThumb,
    comment: payload?.comment,
    badge: payload?.badge,
    read: false
  };

  await createNotification(notification);
}