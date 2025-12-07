import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Dimensions, Image, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Types
interface Video {
  id: number;
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
  onProgressUpdate: (videoId: number, progress: number | ((prev: number) => number)) => void;
}> = ({ video, onLike, onComment, onShare, onProfilePress, isActive, onProgressUpdate }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Gérer la progression de la vidéo
  React.useEffect(() => {
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
        return prevProgress + (100 / video.duration / 10);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, video.id, video.duration]);

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
        <Image 
          source={{ uri: video.videoUrl }}
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
              source={{ uri: 'https://via.placeholder.com/48/CCCCCC/666666?text=👤' }}
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
          <Text style={styles.actionCount}>{video.comments}</Text>
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

// Comments Modal Component
const CommentsModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  comments: Comment[];
  onAddComment: (text: string) => void;
  onCommentLike: (commentId: number) => void;
  onToggleReplies: (commentId: number) => void;
  onReplyLike: (commentId: number, replyId: number) => void;
  onDeleteComment: (commentId: number) => void;
  onReplyToComment: (commentId: number, replyText: string) => void;
}> = ({ visible, onClose, comments, onAddComment, onCommentLike, onToggleReplies, onReplyLike, onDeleteComment, onReplyToComment }) => {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ commentId: number; username: string } | null>(null);

  const handleSubmit = () => {
    if (newComment.trim()) {
      if (replyingTo) {
        // Répondre à un commentaire
        onReplyToComment(replyingTo.commentId, newComment);
        setReplyingTo(null);
      } else {
        // Nouveau commentaire
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

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderSpacer} />
          <Text style={styles.modalTitle}>{comments.length} commentaires</Text>
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
                    
                    {/* Bouton Répondre */}
                    <TouchableOpacity onPress={() => handleReply(comment.id, comment.username)}>
                      <Text style={styles.replyButton}>Répondre</Text>
                    </TouchableOpacity>
                    
                    {/* Bouton Supprimer (uniquement pour les commentaires de l'utilisateur) */}
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
            {/* Indicateur de réponse */}
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

// Share Modal Component
const ShareModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  if (!visible) return null;

  // Options d'envoi (première ligne)
  const shareOptions = [
    { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
    { id: 'messages', label: 'Messages', icon: 'chatbubble', color: '#007AFF' },
    { id: 'sms', label: 'SMS', icon: 'mail', color: '#34C759' },
    { id: 'messenger', label: 'Messenger', icon: 'logo-facebook', color: '#0084FF' },
    { id: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
    { id: 'snapchat', label: 'Snapchat', icon: 'logo-snapchat', color: '#FFFC00' },
    { id: 'twitter', label: 'Twitter', icon: 'logo-twitter', color: '#1DA1F2' },
  ];

  // Actions sur la vidéo (deuxième ligne)
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
    // Ici tu peux ajouter la logique de partage
    onClose();
  };

  const handleVideoAction = (actionId: string) => {
    console.log('Action vidéo:', actionId);
    
    if (actionId === 'copy-link') {
      // Copier le lien
      console.log('Lien copié !');
    }
    
    onClose();
  };

  return (
    <View style={styles.modalOverlay}>
      <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.shareModalContent}>
        {/* Handle du modal */}
        <View style={styles.modalHandle} />

        {/* Titre principal */}
        <Text style={styles.shareMainTitle}>Partager vers</Text>

        {/* PREMIÈRE LIGNE - Options d'envoi */}
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

        {/* Séparateur */}
        <View style={styles.shareDivider} />

        {/* DEUXIÈME LIGNE - Actions sur la vidéo */}
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

        {/* Bouton Annuler */}
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
  
  const [videos, setVideos] = useState<Video[]>([
    {
      id: 1,
      creatorUsername: 'SophieMartin',
      creatorAvatar: '👩‍💼',
      creatorLevel: 'expert',
      videoUrl: 'https://via.placeholder.com/400x800/FF6B35/FFFFFF?text=Video+1',
      title: '5 STRATÉGIES DE MARKETING DIGITAL POUR 2025',
      description: 'Découvrez les meilleures stratégies de marketing digitales pour booster votre présence en ligne et atteindre vos objectifs commerciaux.',
      hashtags: ['MarketingDigital', 'Business', 'Stratégie', '2025'],
      likes: 4445,
      comments: 579,
      publishDate: '1-28',
      isLiked: false,
      duration: 60, // 60 secondes
      progress: 0,
    },
    {
      id: 2,
      creatorUsername: 'TechWithMarie',
      creatorAvatar: '👨‍💻',
      creatorLevel: 'diplome',
      videoUrl: 'https://via.placeholder.com/400x800/7C3AED/FFFFFF?text=Video+2',
      title: 'APPRENDRE PYTHON EN 60 SECONDES',
      description: 'Les bases essentielles de Python expliquées simplement pour les débutants.',
      hashtags: ['Python', 'Coding', 'Tech', 'Tutorial'],
      likes: 2340,
      comments: 187,
      publishDate: '2-15',
      isLiked: false,
      duration: 45, // 45 secondes
      progress: 0,
    },
    {
      id: 3,
      creatorUsername: 'DesignByAlex',
      creatorAvatar: '🎨',
      creatorLevel: 'amateur',
      videoUrl: 'https://via.placeholder.com/400x800/F97316/FFFFFF?text=Video+3',
      title: 'ASTUCE DESIGN UI : UTILISER LES OMBRES',
      description: 'Comment créer de la profondeur dans vos designs avec des ombres subtiles.',
      hashtags: ['Design', 'UI', 'UX', 'Tips'],
      likes: 1820,
      comments: 94,
      publishDate: '3-02',
      isLiked: false,
      duration: 30, // 30 secondes
      progress: 0,
    },
  ]);

  const [comments, setComments] = useState<Comment[]>([
    { 
      id: 1, 
      username: 'martini_rond', 
      text: 'Super contenu ! Très utile', 
      time: '22h', 
      likes: 89, 
      replies: 4, 
      isLiked: false,
      showReplies: false,
      repliesData: [
        { id: 101, username: 'sophie_dev', text: 'Tout à fait d\'accord !', time: '21h', likes: 12, isLiked: false },
        { id: 102, username: 'jean_tech', text: 'Merci pour le partage', time: '20h', likes: 8, isLiked: false },
        { id: 103, username: 'marie_design', text: 'Très intéressant', time: '19h', likes: 5, isLiked: false },
        { id: 104, username: 'alex_code', text: 'Super explication', time: '18h', likes: 3, isLiked: false },
      ]
    },
    { 
      id: 2, 
      username: 'maxjacobson', 
      text: 'Merci pour ces conseils', 
      time: '22h', 
      likes: 67, 
      replies: 1, 
      isLiked: false,
      showReplies: false,
      repliesData: [
        { id: 201, username: 'paul_dev', text: 'De rien, content que ça aide !', time: '21h', likes: 15, isLiked: false },
      ]
    },
    { 
      id: 3, 
      username: 'zackjohn', 
      text: 'Exactement ce que je cherchais', 
      time: '21h', 
      likes: 45, 
      replies: 0, 
      isLiked: false,
      showReplies: false
    },
    { 
      id: 4, 
      username: 'kiero_d', 
      text: 'Génial, hâte de tester ça', 
      time: '21h', 
      likes: 32, 
      replies: 2, 
      verified: true, 
      isLiked: false,
      showReplies: false,
      repliesData: [
        { id: 401, username: 'emma_ui', text: 'Tiens-nous au courant !', time: '20h', likes: 7, isLiked: false },
        { id: 402, username: 'lucas_web', text: 'Bonne chance !', time: '19h', likes: 4, isLiked: false },
      ]
    },
    { 
      id: 5, 
      username: 'karennne', 
      text: 'Des astuces en or !', 
      time: '15h', 
      likes: 28, 
      replies: 0, 
      isLiked: false,
      showReplies: false
    },
  ]);

  const handleLike = (videoId: number) => {
    setVideos(videos.map(video => {
      if (video.id === videoId) {
        return {
          ...video,
          isLiked: !video.isLiked,
          likes: video.isLiked ? video.likes - 1 : video.likes + 1
        };
      }
      return video;
    }));
  };

  const handleAddComment = (text: string) => {
    // Créer un nouveau commentaire
    const newComment: Comment = {
      id: comments.length + 1,
      username: 'Vous', // Nom de l'utilisateur actuel
      text: text,
      time: 'À l\'instant',
      likes: 0,
      replies: 0,
      verified: false,
      isLiked: false,
      showReplies: false,
      repliesData: []
    };
    
    // Ajouter le nouveau commentaire EN HAUT de la liste
    setComments([newComment, ...comments]);
    
    // Incrémenter le compteur de commentaires de la vidéo actuelle
    setVideos(videos.map(video => {
      if (video.id === videos[currentVideoIndex].id) {
        return {
          ...video,
          comments: video.comments + 1
        };
      }
      return video;
    }));
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

  const handleDeleteComment = (commentId: number) => {
    // Supprimer le commentaire de la liste
    setComments(comments.filter(comment => comment.id !== commentId));
    
    // Décrémenter le compteur de commentaires de la vidéo actuelle
    setVideos(videos.map(video => {
      if (video.id === videos[currentVideoIndex].id) {
        return {
          ...video,
          comments: video.comments - 1
        };
      }
      return video;
    }));
  };

  const handleReplyToComment = (commentId: number, replyText: string) => {
    // Créer une nouvelle réponse
    const newReply: Reply = {
      id: Date.now(), // ID unique basé sur le timestamp
      username: 'Vous',
      text: replyText,
      time: 'À l\'instant',
      likes: 0,
      isLiked: false
    };
    
    // Ajouter la réponse au commentaire
    setComments(comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          replies: comment.replies + 1,
          showReplies: true, // Afficher automatiquement les réponses
          repliesData: comment.repliesData 
            ? [newReply, ...comment.repliesData] // Ajouter en premier
            : [newReply]
        };
      }
      return comment;
    }));
  };

  const handleProgressUpdate = (videoId: number, progressOrUpdater: number | ((prev: number) => number)) => {
    setVideos(videos => videos.map(video => {
      if (video.id === videoId) {
        const newProgress = typeof progressOrUpdater === 'function' 
          ? progressOrUpdater(video.progress) 
          : progressOrUpdater;
        return {
          ...video,
          progress: Math.min(100, Math.max(0, newProgress))
        };
      }
      return video;
    }));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Video Feed */}
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
            onComment={() => setShowComments(true)}
            onShare={() => setShowShare(true)}
            onProfilePress={() => console.log('Navigate to profile:', video.creatorUsername)}
            isActive={index === currentVideoIndex}
            onProgressUpdate={handleProgressUpdate}
          />
        ))}
      </ScrollView>

      {/* Modals */}
      <CommentsModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        comments={comments}
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