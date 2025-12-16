/**
 * 🔥 Firebase Utils - Index
 * 
 * Point d'entrée centralisé pour toutes les fonctionnalités Firebase
 */

// ============================================
// 👤 GESTION DU PROFIL UTILISATEUR
// ============================================
export {
  createUserProfile,
  uploadProfileImage,
  deleteOldProfileImage,
  updateUserProfile,
  updateProfileImage,
  getUserProfile,
  removeProfileImage,
  type UserRegistrationData,
  type UserProfileUpdate,
} from './userProfile';

// ============================================
// 🎥 GESTION DES VIDÉOS
// ============================================
export {
  uploadVideo,
  uploadThumbnail,
  updateVideo,
  deleteVideo,
  getVideo,
  getUserVideos,
  getPublicVideos,
  incrementVideoViews,
  getVideosByCategory,
  type VideoData,
  type VideoUploadProgress,
} from './videoManager';

// ============================================
// 💬 INTERACTIONS SOCIALES
// ============================================
export {
  likeContent,
  unlikeContent,
  hasLiked,
  addComment,
  updateComment,
  deleteComment,
  getComments,
  saveContent,
  unsaveContent,
  hasSaved,
  getSavedContent,
  shareContent,
} from './socialInteractions';

// ============================================
// 📨 MESSAGERIE
// ============================================
export {
  getOrCreateConversation,
  sendMessage,
  markMessagesAsRead,
  getMessages,
  subscribeToMessages,
  getConversations,
  subscribeToConversations,
  getTotalUnreadCount,
  deleteConversation,
  type Message,
  type Conversation,
} from './messaging';

// ============================================
// 👥 SYSTÈME DE SUIVI (FOLLOW)
// ============================================
export {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowers,
  getFollowing,
  getFollowCounts,
  searchUsers,
  getSuggestedUsers,
  getMutualFollows,
} from './followSystem';