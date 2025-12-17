import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Dimensions, Image, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { 
  likeContent, 
  unlikeContent, 
  hasLiked,
  addComment, 
  deleteComment,
  getComments,
  saveContent,
  unsaveContent,
  hasSaved,
  shareContent 
} from '../utils/index';
// ✅ IMPORT CORRIGÉ : On importe getPublicVideos
import { getPublicVideos } from '../utils/videoManager';
import { auth } from '../../firebaseConfig.js';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Types
interface Video {
  // ✅ MODIFICATION : id accepte string (Firestore) ou number
  id: string | number;
  creatorUsername: string;
  creatorAvatar: string;
  creatorLevel: 'amateur' | 'diplome' | 'expert';
  videoUrl: string;
  title: string;
  description: string;
  hashtags: string[];
  likes: number;
  comments: number;
  publishDate: string;
  isLiked: boolean;
  duration: number; // Durée en secondes
  progress: number; // Progression en pourcentage (0-100)
}

interface Reply {
  id: number;
  username: string;
  text: string;
  time: string;
  likes: number;
  isLiked?: boolean;
}

interface Comment {
  id: number;
  username: string;
  text: string;
  time: string;
  likes: number;
  replies: number;
  verified?: boolean;
  isLiked?: boolean;
  repliesData?: Reply[];
  showReplies?: boolean;
}

// Badge Component for Creator Level
const CreatorBadge: React.FC<{ level: 'amateur' | 'diplome' | 'expert' }> = ({ level }) => {
  const [showLabel, setShowLabel] = useState(false);

  const getBadgeConfig = () => {
    switch (level) {
      case 'amateur':
        return { emoji: '🌱', color: '#10B981', text: 'Amateur' };
      case 'diplome':
        return { emoji: '🎓', color: '#3B82F6', text: 'Diplômé' };
      case 'expert':
        return { emoji: '⭐', color: '#F59E0B', text: 'Expert' };
      default:
        return { emoji: '🌱', color: '#10B981', text: 'Amateur' };
    }
  };

  const config = getBadgeConfig();

  return (
    <TouchableOpacity 
      onPressIn={() => setShowLabel(true)}
      onPressOut={() => setShowLabel(false)}
      activeOpacity={1}
    >
      <View style={[styles.creatorBadge, { backgroundColor: config.color }]}>
        <Text style={styles.badgeEmoji}>{config.emoji}</Text>
        {showLabel && <Text style={styles.badgeText}>{config.text}</Text>}
      </View>
    </TouchableOpacity>
  );
};

// Video Item Component
const VideoItem: React.FC<{
  video: Video;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onProfilePress: () => void;
  isActive: boolean;
  onProgressUpdate: (videoId: string | number, progress: number | ((prev: number) => number)) => void;
}> = ({ video, onLike, onComment, onShare, onProfilePress, isActive, onProgressUpdate }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Gérer la progression de la vidéo
  useEffect(() => {
    if (!isActive) return;

    // Réinitialiser la progression quand la vidéo devient active
    onProgressUpdate(video.id, 0);

    const interval = setInterval(() => {
      onProgressUpdate(video.id, (prevProgress: number) => {
        if (prevProgress >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Avancer de ~1.67% par 100ms pour une vidéo de 60s (1000ms / 60s = ~1.67% par seconde)
        // Sécurité : éviter division par zéro
        const duration = video.duration > 0 ? video.duration : 60;
        return prevProgress + (100 / duration / 10);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, onProgressUpdate, video.duration, video.id]);

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <View style={styles.videoContainer}>
      {/* Video Background */}
      <View style={styles.videoBackground}>
        {/* Note: Pour une vraie vidéo, utilisez <Video /> de expo-av */}
        <Image 
          source={{ uri: video.videoUrl }} // Ici c'est une image (thumbnail) pour la démo
          style={styles.videoImage}
          resizeMode="cover"
        />
      </View>

      {/* Progress Bar at the bottom */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${video.progress}%` }]} />
        </View>
      </View>

      {/* Right Action Column */}
      <View style={styles.actionsColumn}>
        {/* Creator Profile Picture */}
        <TouchableOpacity onPress={onProfilePress} style={styles.profileButton}>
          <View style={styles.creatorAvatarLarge}>
            <Image 
              source={{ uri: video.creatorAvatar || 'https://via.placeholder.com/48/CCCCCC/666666?text=👤' }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          </View>
        </TouchableOpacity>

        {/* Like Button */}
        <TouchableOpacity onPress={onLike} style={styles.actionButton}>
          <View style={styles.actionIconCircle}>
            <Ionicons 
              name={video.isLiked ? "heart" : "heart-outline"} 
              size={28} 
              color={video.isLiked ? "#FF2D55" : "#FFFFFF"} 
            />
          </View>
          <Text style={styles.actionCount}>{formatCount(video.likes)}</Text>
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity onPress={onComment} style={styles.actionButton}>
          <View style={styles.actionIconCircle}>
            <Ionicons name="chatbubble-ellipses-outline" size={26} color="#FFFFFF" />
          </View>
          <Text style={styles.actionCount}>{formatCount(video.comments)}</Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity onPress={onShare} style={styles.actionButton}>
          <View style={styles.actionIconCircle}>
            <Ionicons name="arrow-redo-outline" size={26} color="#FFFFFF" />
          </View>
          <Text style={styles.actionCount}>Partager</Text>
        </TouchableOpacity>

        {/* Spacer */}
        <View style={styles.actionSpacer} />

        {/* Creator Level Badge */}
        <CreatorBadge level={video.creatorLevel} />
      </View>

      {/* Bottom Video Info */}
      <View style={styles.videoInfo}>
        <View style={styles.infoHeader}>
          <Text style={styles.infoUsername}>@{video.creatorUsername}</Text>
          <Text style={styles.infoDate}> · {video.publishDate}</Text>
        </View>

        <Text style={styles.infoTitle}>{video.title}</Text>

        <View>
          <Text style={styles.infoDescription} numberOfLines={showFullDescription ? undefined : 2}>
            {video.description}
          </Text>
          {video.description.length > 80 && (
            <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
              <Text style={styles.showMore}>
                {showFullDescription ? 'voir moins' : 'afficher plus'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.hashtagContainer}>
          {video.hashtags.map((tag, index) => (
            <TouchableOpacity key={index}>
              <Text style={styles.hashtag}>#{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

// Comments Modal Component (Reste inchangé, je l'inclus pour complétude)
const CommentsModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  comments: Comment[];
  totalComments: number;
  onAddComment: (text: string) => void;
  onCommentLike: (commentId: number) => void;
  onToggleReplies: (commentId: number) => void;
  onReplyLike: (commentId: number, replyId: number) => void;
  onDeleteComment: (commentId: number) => void;
  onReplyToComment: (commentId: number, replyText: string) => void;
}> = ({ visible, onClose, comments, totalComments, onAddComment, onCommentLike, onToggleReplies, onReplyLike, onDeleteComment, onReplyToComment }) => {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ commentId: number; username: string } | null>(null);

  const handleSubmit = () => {
    if (newComment.trim()) {
      if (replyingTo) {
        onReplyToComment(replyingTo.commentId, newComment);
        setReplyingTo(null);
      } else {
        onAddComment(newComment);
      }
      setNewComment('');
    }
  };

  const handleReply = (commentId: number, username: string) => {
    setReplyingTo({ commentId, username });
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderSpacer} />
          <Text style={styles.modalTitle}>{formatCount(totalComments)} commentaires</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.commentsList}>
          {comments.map((comment) => (
            <View key={comment.id}>
              {/* Main Comment */}
              <View style={styles.commentItem}>
                <View style={styles.commentAvatar}>
                  <Image 
                    source={{ uri: 'https://via.placeholder.com/36/CCCCCC/666666?text=👤' }}
                    style={styles.commentAvatarImage}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUsername}>{comment.username}</Text>
                    {comment.verified && <Text style={styles.verifiedBadge}>✓</Text>}
                  </View>
                  <Text style={styles.commentText}>{comment.text}</Text>
                  <View style={styles.commentFooter}>
                    <Text style={styles.commentTime}>{comment.time}</Text>
                    <TouchableOpacity onPress={() => handleReply(comment.id, comment.username)}>
                      <Text style={styles.replyButton}>Répondre</Text>
                    </TouchableOpacity>
                    {comment.username === 'Vous' && (
                      <TouchableOpacity onPress={() => onDeleteComment(comment.id)}>
                        <Text style={styles.deleteButton}>Supprimer</Text>
                      </TouchableOpacity>
                    )}
                    {comment.replies > 0 && (
                      <TouchableOpacity onPress={() => onToggleReplies(comment.id)}>
                        <Text style={styles.viewReplies}>
                          {comment.showReplies ? 'Masquer les réponses' : `Voir les réponses (${comment.replies})`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <TouchableOpacity style={styles.commentLike} onPress={() => onCommentLike(comment.id)}>
                  <Ionicons 
                    name={comment.isLiked ? "heart" : "heart-outline"} 
                    size={18} 
                    color={comment.isLiked ? "#FF2D55" : "#999"} 
                  />
                  <Text style={styles.commentLikeCount}>{comment.likes}</Text>
                </TouchableOpacity>
              </View>

              {/* Replies */}
              {comment.showReplies && comment.repliesData && (
                <View style={styles.repliesContainer}>
                  {comment.repliesData.map((reply) => (
                    <View key={reply.id} style={styles.replyItem}>
                      <View style={styles.replyAvatar}>
                        <Image 
                          source={{ uri: 'https://via.placeholder.com/28/CCCCCC/666666?text=👤' }}
                          style={styles.replyAvatarImage}
                          resizeMode="cover"
                        />
                      </View>
                      <View style={styles.replyContent}>
                        <View style={styles.replyHeader}>
                          <Text style={styles.replyUsername}>{reply.username}</Text>
                        </View>
                        <Text style={styles.replyText}>{reply.text}</Text>
                        <View style={styles.replyFooter}>
                          <Text style={styles.replyTime}>{reply.time}</Text>
                          <TouchableOpacity onPress={() => handleReply(comment.id, reply.username)}>
                            <Text style={styles.replyButtonSmall}>Répondre</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <TouchableOpacity 
                        style={styles.replyLike}
                        onPress={() => onReplyLike(comment.id, reply.id)}
                      >
                        <Ionicons 
                          name={reply.isLiked ? "heart" : "heart-outline"} 
                          size={14} 
                          color={reply.isLiked ? "#FF2D55" : "#999"} 
                        />
                        <Text style={styles.replyLikeCount}>{reply.likes}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={styles.addCommentContainer}>
          <View style={styles.addCommentAvatar}>
            <Image 
              source={{ uri: 'https://via.placeholder.com/36/CCCCCC/666666?text=👤' }}
              style={styles.addCommentAvatarImage}
              resizeMode="cover"
            />
          </View>
          <View style={styles.addCommentInputWrapper}>
            {replyingTo && (
              <View style={styles.replyingIndicator}>
                <Text style={styles.replyingText}>
                  Réponse à @{replyingTo.username}
                </Text>
                <TouchableOpacity onPress={handleCancelReply}>
                  <Text style={styles.cancelReplyButton}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.addCommentInput}>
              <TextInput
                placeholder={replyingTo ? `Répondre à @${replyingTo.username}...` : "Ajouter un commentaire..."}
                value={newComment}
                onChangeText={setNewComment}
                onSubmitEditing={handleSubmit}
                style={styles.input}
                placeholderTextColor="#999"
              />
              <TouchableOpacity onPress={handleSubmit}>
                <Text style={styles.sendButton}>➤</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

// Share Modal (Reste inchangé)
const ShareModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  if (!visible) return null;

  const shareOptions = [
    { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
    { id: 'messages', label: 'Messages', icon: 'chatbubble', color: '#007AFF' },
    { id: 'sms', label: 'SMS', icon: 'mail', color: '#34C759' },
    { id: 'messenger', label: 'Messenger', icon: 'logo-facebook', color: '#0084FF' },
    { id: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
    { id: 'snapchat', label: 'Snapchat', icon: 'logo-snapchat', color: '#FFFC00' },
    { id: 'twitter', label: 'Twitter', icon: 'logo-twitter', color: '#1DA1F2' },
  ];

  const videoActions = [
    { id: 'report', label: 'Signaler', icon: 'flag-outline', color: '#FF3B30' },
    { id: 'not-interested', label: 'Pas intéressé', icon: 'close-circle-outline', color: '#FF9500' },
    { id: 'copy-link', label: 'Copier le lien', icon: 'link-outline', color: '#007AFF' },
    { id: 'save', label: 'Enregistrer', icon: 'download-outline', color: '#34C759' },
    { id: 'favorites', label: 'Favoris', icon: 'heart-outline', color: '#FF2D55' },
    { id: 'duet', label: 'Duo', icon: 'people-outline', color: '#5856D6' },
  ];

  const handleShareOption = (optionId: string) => {
    console.log('Partager vers:', optionId);
    onClose();
  };

  const handleVideoAction = (actionId: string) => {
    console.log('Action vidéo:', actionId);
    if (actionId === 'copy-link') {
      console.log('Lien copié !');
    }
    onClose();
  };

  return (
    <View style={styles.modalOverlay}>
      <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.shareModalContent}>
        <View style={styles.modalHandle} />
        <Text style={styles.shareMainTitle}>Partager vers</Text>
        <View style={styles.shareSectionContainer}>
          <Text style={styles.shareSectionTitle}>Envoyer à</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.shareScrollRow}
            contentContainerStyle={styles.shareScrollContent}
          >
            {shareOptions.map((option) => (
              <TouchableOpacity 
                key={option.id} 
                style={styles.shareOptionItem}
                onPress={() => handleShareOption(option.id)}
              >
                <View style={[styles.shareIconCircle, { backgroundColor: option.color }]}>
                  <Ionicons name={option.icon as any} size={26} color="#FFF" />
                </View>
                <Text style={styles.shareOptionLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={styles.shareDivider} />
        <View style={styles.shareSectionContainer}>
          <Text style={styles.shareSectionTitle}>Actions</Text>
          <View style={styles.videoActionsGrid}>
            {videoActions.map((action) => (
              <TouchableOpacity 
                key={action.id} 
                style={styles.videoActionItem}
                onPress={() => handleVideoAction(action.id)}
              >
                <View style={[styles.shareActionIconCircle, { backgroundColor: action.color }]}>
                  <Ionicons name={action.icon as any} size={22} color="#FFF" />
                </View>
                <Text style={styles.videoActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Main App Component
export default function VideoFeedApp() {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [videos, setVideos] = useState<Video[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  // ✅ CHARGER LES VIDÉOS DEPUIS FIREBASE
  useEffect(() => {
    loadVideosFromFirebase();
  }, []);

  const loadVideosFromFirebase = async () => {
    try {
      setLoading(true);
      
      // ✅ APPEL À LA VRAIE BASE DE DONNÉES
      const firebaseVideos = await getPublicVideos(20);
      
      // Si la base est vide ou erreur, on garde un fallback pour que l'app ne soit pas vide
      if (!firebaseVideos || firebaseVideos.length === 0) {
        console.log("Aucune vidéo trouvée, chargement démo...");
        // Tu peux remettre le tableau demoVideos ici si tu veux une solution de repli
        // Pour l'instant, on laisse vide pour bien voir si Firebase répond
      }

      const mappedVideos: Video[] = firebaseVideos.map((v: any) => ({
        id: v.id,
        creatorUsername: v.creatorUsername || 'Utilisateur',
        creatorAvatar: v.thumbnail || 'https://via.placeholder.com/150', // Utilise le thumbnail si pas d'avatar
        creatorLevel: 'amateur', // Valeur par défaut
        videoUrl: v.videoUrl, // L'URL de la vidéo stockée
        title: v.title || 'Sans titre',
        description: v.description || '',
        hashtags: v.tags || [],
        likes: v.likesCount || 0,
        comments: v.commentsCount || 0,
        publishDate: 'Récemment', // Tu peux utiliser formatDate(v.createdAt) si disponible
        isLiked: false,
        duration: v.duration || 60,
        progress: 0,
      }));

      setVideos(mappedVideos);
    } catch (error) {
      console.error('Erreur chargement vidéos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction helper pour formater la date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '1j';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) return "Aujourd'hui";
      if (diffInDays === 1) return '1j';
      if (diffInDays < 7) return `${diffInDays}j`;
      if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}sem`;
      return `${Math.floor(diffInDays / 30)}m`;
    } catch {
      return '1j';
    }
  };

  // ✅ CHARGER LES COMMENTAIRES DEPUIS FIREBASE
  const loadCommentsFromFirebase = async (videoId: string | number) => {
    try {
      const firebaseComments = await getComments(videoId.toString(), 50);
      
      const formattedComments: Comment[] = firebaseComments.map((fbComment: any) => ({
        id: fbComment.id,
        username: fbComment.userId, // Idéalement, il faudrait récupérer le nom d'utilisateur associé
        text: fbComment.text || fbComment.contenu,
        time: formatDate(fbComment.createdAt),
        likes: 0,
        replies: 0,
        verified: false,
        isLiked: false,
        showReplies: false,
        repliesData: []
      }));

      setComments(formattedComments);
    } catch (error) {
      console.error('Erreur chargement commentaires:', error);
      setComments([]);
    }
  };

  // ✅ FONCTION LIKE CONNECTÉE À FIREBASE
  const handleLike = async (videoId: string | number) => {
    if (!auth.currentUser) {
      alert('Vous devez être connecté pour liker');
      return;
    }

    try {
      const video = videos.find(v => v.id === videoId);
      if (!video) return;

      if (video.isLiked) {
        await unlikeContent(videoId.toString(), 'video');
      } else {
        await likeContent(videoId.toString(), 'video');
      }

      // Mettre à jour l'état local
      setVideos(videos.map(v => {
        if (v.id === videoId) {
          return {
            ...v,
            isLiked: !v.isLiked,
            likes: v.isLiked ? v.likes - 1 : v.likes + 1
          };
        }
        return v;
      }));
    } catch (error: any) {
      console.error('Erreur like:', error);
      // On ignore l'erreur si c'est déjà liké
    }
  };

  // ✅ FONCTION AJOUTER COMMENTAIRE CONNECTÉE À FIREBASE
  const handleAddComment = async (text: string) => {
    if (!auth.currentUser) {
      alert('Vous devez être connecté pour commenter');
      return;
    }

    try {
      const currentVideo = videos[currentVideoIndex];
      await addComment(currentVideo.id.toString(), text, 'video');
      
      // Recharger les commentaires
      await loadCommentsFromFirebase(currentVideo.id);
      
      // Incrémenter le compteur
      setVideos(videos.map(video => {
        if (video.id === currentVideo.id) {
          return { ...video, comments: video.comments + 1 };
        }
        return video;
      }));
    } catch (error) {
      console.error('Erreur ajout commentaire:', error);
      alert('Erreur lors de l\'ajout du commentaire');
    }
  };

  // ✅ FONCTION SUPPRIMER COMMENTAIRE CONNECTÉE À FIREBASE
  const handleDeleteComment = async (commentId: number) => {
    if (!auth.currentUser) return;

    try {
      await deleteComment(commentId.toString());
      
      setComments(comments.filter(c => c.id !== commentId));
      
      const currentVideo = videos[currentVideoIndex];
      setVideos(videos.map(video => {
        if (video.id === currentVideo.id) {
          return { ...video, comments: video.comments - 1 };
        }
        return video;
      }));
    } catch (error) {
      console.error('Erreur suppression commentaire:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleOpenComments = () => {
    const currentVideo = videos[currentVideoIndex];
    if (currentVideo) {
      loadCommentsFromFirebase(currentVideo.id);
    }
    setShowComments(true);
  };

  const handleCommentLike = (commentId: number) => {
    setComments(comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          isLiked: !comment.isLiked,
          likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1
        };
      }
      return comment;
    }));
  };

  const handleToggleReplies = (commentId: number) => {
    setComments(comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          showReplies: !comment.showReplies
        };
      }
      return comment;
    }));
  };

  const handleReplyLike = (commentId: number, replyId: number) => {
    setComments(comments.map(comment => {
      if (comment.id === commentId && comment.repliesData) {
        return {
          ...comment,
          repliesData: comment.repliesData.map(reply => {
            if (reply.id === replyId) {
              return {
                ...reply,
                isLiked: !reply.isLiked,
                likes: reply.isLiked ? reply.likes - 1 : reply.likes + 1
              };
            }
            return reply;
          })
        };
      }
      return comment;
    }));
  };

  const handleReplyToComment = (commentId: number, replyText: string) => {
    const newReply: Reply = {
      id: Date.now(),
      username: 'Vous',
      text: replyText,
      time: 'À l\'instant',
      likes: 0,
      isLiked: false
    };
    
    setComments(comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          replies: comment.replies + 1,
          showReplies: true,
          repliesData: comment.repliesData 
            ? [newReply, ...comment.repliesData]
            : [newReply]
        };
      }
      return comment;
    }));
  };

  // ✅ CORRECTION CRITIQUE : useCallback pour éviter la boucle infinie
  const handleProgressUpdate = useCallback((videoId: string | number, progressOrUpdater: number | ((prev: number) => number)) => {
    setVideos(prevVideos => prevVideos.map(video => {
      if (video.id === videoId) {
        const currentProgress = video.progress;
        const newProgress = typeof progressOrUpdater === 'function' 
          ? progressOrUpdater(currentProgress) 
          : progressOrUpdater;
        
        // Optimisation : on ne met pas à jour si le changement est infime pour éviter trop de re-renders
        if (Math.abs(newProgress - currentProgress) < 0.1) return video;

        return {
          ...video,
          progress: Math.min(100, Math.max(0, newProgress))
        };
      }
      return video;
    }));
  }, []); // Le tableau de dépendances vide est la clé !

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#FFF', fontSize: 16 }}>Chargement des vidéos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        ref={scrollViewRef}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        onScroll={(event) => {
          const newIndex = Math.round(event.nativeEvent.contentOffset.y / SCREEN_HEIGHT);
          if (newIndex !== currentVideoIndex) {
            setCurrentVideoIndex(newIndex);
          }
        }}
        style={styles.scrollView}
      >
        {videos.map((video, index) => (
          <VideoItem
            key={video.id}
            video={video}
            onLike={() => handleLike(video.id)}
            onComment={handleOpenComments}
            onShare={() => setShowShare(true)}
            onProfilePress={() => console.log('Navigate to profile:', video.creatorUsername)}
            isActive={index === currentVideoIndex}
            onProgressUpdate={handleProgressUpdate}
          />
        ))}
      </ScrollView>

      <CommentsModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        comments={comments}
        totalComments={videos[currentVideoIndex]?.comments || 0}
        onAddComment={handleAddComment}
        onCommentLike={handleCommentLike}
        onToggleReplies={handleToggleReplies}
        onReplyLike={handleReplyLike}
        onDeleteComment={handleDeleteComment}
        onReplyToComment={handleReplyToComment}
      />

      <ShareModal
        visible={showShare}
        onClose={() => setShowShare(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // ... (Garde tous tes styles existants ici, ils sont parfaits)
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  videoContainer: {
    width: '100%',
    height: SCREEN_HEIGHT,
    position: 'relative',
  },
  videoBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoImage: {
    width: '100%',
    height: '100%',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 10,
  },
  progressBar: {
    width: '100%',
    height: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  actionsColumn: {
    position: 'absolute',
    right: 12,
    bottom: 40,
    alignItems: 'center',
    gap: 12,
    zIndex: 20,
  },
  profileButton: {
    marginBottom: 4,
  },
  creatorAvatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  actionButton: {
    alignItems: 'center',
    gap: 2,
  },
  actionIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCount: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 0,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionSpacer: {
    height: 8,
  },
  creatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 50,
    gap: 6,
  },
  badgeEmoji: {
    fontSize: 20,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  videoInfo: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 80,
    paddingHorizontal: 20,
    zIndex: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoUsername: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  infoDate: {
    color: '#FFF',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  infoTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  infoDescription: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  showMore: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  hashtagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  hashtag: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    zIndex: 50,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalHeaderSpacer: {
    width: 32,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  modalClose: {
    fontSize: 36,
    fontWeight: '300',
    color: '#999',
  },
  modalHandle: {
    width: 36,
    height: 5,
    backgroundColor: '#D1D1D6',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  commentsList: {
    padding: 16,
    maxHeight: 500,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#CCCCCC',
    overflow: 'hidden',
  },
  commentAvatarImage: {
    width: '100%',
    height: '100%',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commentUsername: {
    fontWeight: '600',
    fontSize: 14,
    color: '#000',
  },
  verifiedBadge: {
    color: '#3B82F6',
    fontSize: 14,
  },
  commentText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#000',
  },
  commentFooter: {
    flexDirection: 'row',
    gap: 16,
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
  },
  replyButton: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  deleteButton: {
    fontSize: 12,
    color: '#FF2D55',
    fontWeight: '600',
  },
  viewReplies: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  commentLike: {
    alignItems: 'center',
    gap: 4,
  },
  commentLikeCount: {
    fontSize: 12,
    color: '#999',
  },
  // Replies Styles
  repliesContainer: {
    marginLeft: 48,
    marginTop: 8,
    marginBottom: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#E5E5E5',
    paddingLeft: 12,
  },
  replyItem: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#CCCCCC',
    overflow: 'hidden',
  },
  replyAvatarImage: {
    width: '100%',
    height: '100%',
  },
  replyContent: {
    flex: 1,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  replyUsername: {
    fontWeight: '600',
    fontSize: 13,
    color: '#000',
  },
  replyText: {
    fontSize: 13,
    marginBottom: 4,
    color: '#333',
  },
  replyFooter: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  replyTime: {
    fontSize: 11,
    color: '#999',
  },
  replyButtonSmall: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
  },
  replyLike: {
    alignItems: 'center',
    gap: 2,
  },
  replyLikeCount: {
    fontSize: 10,
    color: '#999',
  },
  addCommentContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFF',
    gap: 12,
  },
  addCommentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#CCCCCC',
    overflow: 'hidden',
  },
  addCommentAvatarImage: {
    width: '100%',
    height: '100%',
  },
  addCommentInputWrapper: {
    flex: 1,
  },
  replyingIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyingText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  cancelReplyButton: {
    fontSize: 18,
    color: '#999',
    fontWeight: '600',
  },
  addCommentInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
  sendButton: {
    fontSize: 20,
    color: '#7C3AED',
  },
  // Share Modal Styles
  shareModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 20,
    maxHeight: '75%',
  },
  shareMainTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 8,
    color: '#000',
  },
  shareSectionContainer: {
    marginBottom: 12,
  },
  shareSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginLeft: 20,
    marginBottom: 10,
  },
  shareScrollRow: {
    paddingLeft: 20,
  },
  shareScrollContent: {
    paddingRight: 20,
  },
  shareOptionItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 70,
  },
  shareIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareOptionLabel: {
    fontSize: 11,
    color: '#000',
    textAlign: 'center',
    fontWeight: '500',
  },
  shareDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 12,
    marginHorizontal: 20,
  },
  videoActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    gap: 8,
  },
  videoActionItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 12,
  },
  shareActionIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoActionLabel: {
    fontSize: 10,
    color: '#000',
    textAlign: 'center',
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#F8F8F8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
});