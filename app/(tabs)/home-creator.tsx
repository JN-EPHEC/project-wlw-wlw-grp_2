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
}

interface Comment {
  id: number;
  username: string;
  text: string;
  time: string;
  likes: number;
  replies: number;
  verified?: boolean;
}

// Icon Components - Exact TikTok Style using pure React Native
const HeartIcon = ({ filled, size = 34 }: { filled?: boolean; size?: number }) => (
  <View style={[styles.iconWrapper, { width: size, height: size }]}>
    <Text style={[styles.heartIcon, { fontSize: size * 0.9, color: filled ? '#FF2D55' : '#FFF' }]}>
      {filled ? '♥' : '♡'}
    </Text>
  </View>
);

const MessageIcon = ({ size = 34 }: { size?: number }) => (
  <View style={[styles.iconWrapper, { width: size, height: size }]}>
    <View style={[styles.commentBubble, { width: size * 0.85, height: size * 0.75 }]}>
      <View style={styles.commentDotsContainer}>
        <View style={[styles.commentDot, { width: size * 0.12, height: size * 0.12 }]} />
        <View style={[styles.commentDot, { width: size * 0.12, height: size * 0.12 }]} />
        <View style={[styles.commentDot, { width: size * 0.12, height: size * 0.12 }]} />
      </View>
    </View>
  </View>
);

const BookmarkIcon = ({ filled, size = 34 }: { filled?: boolean; size?: number }) => (
  <View style={[styles.iconWrapper, { width: size, height: size }]}>
    <View style={[styles.bookmarkOuter, { width: size * 0.65, height: size * 0.85 }]}>
      <View style={[styles.bookmarkInner, { 
        backgroundColor: filled ? '#FFD700' : 'transparent',
        borderColor: '#FFF',
        borderWidth: filled ? 0 : 2
      }]}>
        <View style={[styles.bookmarkNotch, { 
          borderTopColor: filled ? '#FFD700' : '#000',
        }]} />
      </View>
    </View>
  </View>
);

const ShareIcon = ({ size = 34 }: { size?: number }) => (
  <View style={[styles.iconWrapper, { width: size, height: size }]}>
    <View style={styles.shareContainer}>
      {/* Arrow pointing up-right */}
      <View style={[styles.shareArrowContainer, { width: size * 0.7, height: size * 0.7 }]}>
        <View style={[styles.shareArrowLine, { width: size * 0.4, height: 2.5 }]} />
        <View style={styles.shareArrowHead} />
      </View>
      {/* Box at bottom */}
      <View style={[styles.shareBox, { width: size * 0.6, height: size * 0.35 }]} />
    </View>
  </View>
);

// Badge Component for Creator Level - Shows text on hover
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
}> = ({ video, onLike, onComment, onShare, onProfilePress }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);

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

      {/* Right Action Column */}
      <View style={styles.actionsColumn}>
        {/* Creator Profile Picture */}
        <TouchableOpacity onPress={onProfilePress} style={styles.profileButton}>
          <View style={styles.creatorAvatarLarge}>
            <Text style={styles.avatarEmoji}>{video.creatorAvatar}</Text>
          </View>
        </TouchableOpacity>

        {/* Like Button */}
        <TouchableOpacity onPress={onLike} style={styles.actionButton}>
          <HeartIcon filled={video.isLiked} size={34} />
          <Text style={styles.actionCount}>{video.likes >= 1000 ? `${(video.likes / 1000).toFixed(1)}k` : video.likes}</Text>
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity onPress={onComment} style={styles.actionButton}>
          <MessageIcon size={34} />
          <Text style={styles.actionCount}>{video.comments}</Text>
        </TouchableOpacity>

        {/* Bookmark Button */}
        <TouchableOpacity onPress={onShare} style={styles.actionButton}>
          <BookmarkIcon filled={false} size={34} />
          <Text style={styles.actionCount}>115.7k</Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity onPress={onShare} style={styles.actionButton}>
          <ShareIcon size={34} />
          <Text style={styles.actionCount}>206.1k</Text>
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
}> = ({ visible, onClose, comments, onAddComment }) => {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = () => {
    if (newComment.trim()) {
      onAddComment(newComment);
      setNewComment('');
    }
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
            <View key={comment.id} style={styles.commentItem}>
              <View style={styles.commentAvatar} />
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUsername}>{comment.username}</Text>
                  {comment.verified && <Text style={styles.verifiedBadge}>✓</Text>}
                </View>
                <Text style={styles.commentText}>{comment.text}</Text>
                <View style={styles.commentFooter}>
                  <Text style={styles.commentTime}>{comment.time}</Text>
                  {comment.replies > 0 && (
                    <TouchableOpacity>
                      <Text style={styles.viewReplies}>Voir les réponses ({comment.replies})</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <TouchableOpacity style={styles.commentLike}>
                <Text style={{ fontSize: 16 }}>🤍</Text>
                <Text style={styles.commentLikeCount}>{comment.likes}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <View style={styles.addCommentContainer}>
          <View style={styles.addCommentAvatar} />
          <View style={styles.addCommentInput}>
            <TextInput
              placeholder="Ajouter un commentaire..."
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
  );
};

// Share Modal Component
const ShareModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  if (!visible) return null;

  const shareOptions = [
    { id: 'whatsapp', label: 'WhatsApp', color: '#25D366', icon: '📱' },
    { id: 'whatsapp-status', label: 'WhatsApp\nstatus', color: '#128C7E', icon: '📱' },
    { id: 'message', label: 'Message', color: '#FF375F', icon: '✈️' },
    { id: 'sms', label: 'SMS', color: '#25D366', icon: '💬' },
    { id: 'messenger', label: 'Messenger', color: '#0084FF', icon: '✉️' },
    { id: 'instagram', label: 'Instagram', color: '#E4405F', icon: '📷' },
  ];

  const moreOptions = [
    { id: 'report', label: 'Report', icon: '⚠️' },
    { id: 'not-interested', label: 'Not interested', icon: '♡' },
    { id: 'save', label: 'Save video', icon: '⬇️' },
    { id: 'duet', label: 'Duet', icon: '👥' },
    { id: 'react', label: 'React', icon: '📄' },
    { id: 'add-favorites', label: 'Add to Favorites', icon: '🔖' },
  ];

  return (
    <View style={styles.modalOverlay}>
      <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.shareModalContent}>
        <View style={styles.modalHandle} />
        <Text style={styles.shareTitle}>Share to</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shareScrollRow}>
          {shareOptions.map((option) => (
            <TouchableOpacity key={option.id} style={styles.shareOptionHorizontal}>
              <View style={[styles.shareIconCircle, { backgroundColor: option.color }]}>
                <Text style={styles.shareEmojiLarge}>{option.icon}</Text>
              </View>
              <Text style={styles.shareLabelSmall}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.moreOptionsGrid}>
          {moreOptions.map((option) => (
            <TouchableOpacity key={option.id} style={styles.moreOption}>
              <Text style={styles.moreOptionEmoji}>{option.icon}</Text>
              <Text style={styles.moreOptionLabel}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
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
    },
  ]);

  const [comments] = useState<Comment[]>([
    { id: 1, username: 'martini_rond', text: 'Super contenu ! Très utile', time: '22h', likes: 89, replies: 4 },
    { id: 2, username: 'maxjacobson', text: 'Merci pour ces conseils', time: '22h', likes: 67, replies: 1 },
    { id: 3, username: 'zackjohn', text: 'Exactement ce que je cherchais', time: '21h', likes: 45, replies: 0 },
    { id: 4, username: 'kiero_d', text: 'Génial, hâte de tester ça', time: '21h', likes: 32, replies: 2, verified: true },
    { id: 5, username: 'karennne', text: 'Des astuces en or !', time: '15h', likes: 28, replies: 0 },
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
    console.log('New comment:', text);
    // Logic to add comment would go here
  };

  const handleRefresh = () => {
    // Logic to refresh feed would go here
    console.log('Refreshing feed...');
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
        {videos.map((video) => (
          <VideoItem
            key={video.id}
            video={video}
            onLike={() => handleLike(video.id)}
            onComment={() => setShowComments(true)}
            onShare={() => setShowShare(true)}
            onProfilePress={() => console.log('Navigate to profile:', video.creatorUsername)}
          />
        ))}
      </ScrollView>

      {/* Modals */}
      <CommentsModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        comments={comments}
        onAddComment={handleAddComment}
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
  actionsColumn: {
    position: 'absolute',
    right: 12,
    bottom: 100,
    alignItems: 'center',
    gap: 20,
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
  },
  avatarEmoji: {
    fontSize: 24,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
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
  // Icon Styles
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartIcon: {
    fontWeight: '400',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  commentBubble: {
    backgroundColor: '#FFF',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  commentDotsContainer: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  commentDot: {
    backgroundColor: '#000',
    borderRadius: 100,
  },
  bookmarkOuter: {
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  bookmarkInner: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
    position: 'relative',
  },
  bookmarkNotch: {
    position: 'absolute',
    bottom: -1,
    left: '50%',
    marginLeft: -5,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  shareContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareArrowContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareArrowLine: {
    backgroundColor: '#FFF',
    position: 'absolute',
    transform: [{ rotate: '45deg' }, { translateY: -4 }],
  },
  shareArrowHead: {
    position: 'absolute',
    top: -2,
    right: 0,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFF',
    transform: [{ rotate: '45deg' }],
  },
  shareBox: {
    position: 'absolute',
    bottom: 2,
    borderWidth: 2,
    borderColor: '#FFF',
    borderRadius: 2,
    borderTopWidth: 0,
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
    backgroundColor: '#7C3AED',
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
  viewReplies: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  commentLike: {
    alignItems: 'center',
  },
  commentLikeCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
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
    backgroundColor: '#F97316',
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
    paddingBottom: 34,
  },
  shareTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 12,
    color: '#000',
  },
  shareScrollRow: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  shareScrollContent: {
    paddingRight: 16,
  },
  shareOptionHorizontal: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  shareIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareEmojiLarge: {
    fontSize: 28,
  },
  shareLabelSmall: {
    fontSize: 12,
    color: '#000',
    textAlign: 'center',
    lineHeight: 16,
  },
  moreOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  moreOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    width: '48%',
    gap: 12,
  },
  moreOptionEmoji: {
    fontSize: 22,
  },
  moreOptionLabel: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 0,
    alignItems: 'center',
    marginHorizontal: 0,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    marginTop: 10,
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
});