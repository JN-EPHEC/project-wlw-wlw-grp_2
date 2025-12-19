import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Share, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_SIZE = (SCREEN_WIDTH - 48) / 2 - 6;

interface CreatorData {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'formateur' | 'apprenant';
  bio?: string;
  profileImage?: string;
  coverImage?: string;
  followers?: string[];
  following?: string[];
  interests?: string[];
  createdAt?: any;
  stats?: {
    videosWatched: number;
    streak: number;
    totalMinutes: number;
  };
  badges?: string[];
}

interface VideoData {
  id: string;
  title: string;
  thumbnailUrl?: string;
  videoUrl: string;
  views: number;
  likes: number;
  creatorId: string;
}

const BADGES_DATA = [
  { id: 'first_video', name: 'Première Vidéo', icon: '🎬', description: 'A regardé sa première vidéo' },
  { id: 'streak_7', name: 'Série 7 jours', icon: '🔥', description: '7 jours consécutifs' },
  { id: 'learner_10', name: '10 Vidéos', icon: '📚', description: 'A regardé 10 vidéos' },
];

export default function ProfilePage() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const [creator, setCreator] = useState<CreatorData | null>(null);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'videos' | 'popular' | 'badges' | 'activity'>('videos');
  const [showShareModal, setShowShareModal] = useState(false);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (id) {
      loadCreatorProfile();
      loadCreatorVideos();
    }
  }, [id]);

  const loadCreatorProfile = async () => {
    try {
      if (!id) return;

      const creatorDoc = await getDoc(doc(db, 'users', id));
      if (creatorDoc.exists()) {
        const data = creatorDoc.data() as Omit<CreatorData, 'uid'>;
        setCreator({ 
          ...data, 
          uid: id,
          role: data.role || 'apprenant',
          stats: data.stats || { videosWatched: 0, streak: 0, totalMinutes: 0 },
          badges: data.badges || [],
          interests: data.interests || []
        });
        setFollowersCount(data.followers?.length || 0);
        setActiveTab(data.role === 'formateur' ? 'videos' : 'badges');

        if (currentUser) {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setIsFollowing(userData.following?.includes(id) || false);
          }
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading creator profile:', error);
      setLoading(false);
    }
  };

  const loadCreatorVideos = async () => {
    try {
      if (!id) return;

      const videosQuery = query(
        collection(db, 'videos'),
        where('creatorId', '==', id)
      );

      const snapshot = await getDocs(videosQuery);
      const videosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VideoData[];

      setVideos(videosData);
    } catch (error) {
      console.error('Error loading creator videos:', error);
    }
  };

  const handleFollow = async () => {
    try {
      if (!currentUser || !id) return;

      if (isFollowing) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          following: arrayRemove(id)
        });
        await updateDoc(doc(db, 'users', id), {
          followers: arrayRemove(currentUser.uid)
        });
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          following: arrayUnion(id)
        });
        await updateDoc(doc(db, 'users', id), {
          followers: arrayUnion(currentUser.uid)
        });
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Découvrez le profil de ${creator?.firstName} ${creator?.lastName} sur SwipeSkills !`,
      });
      setShowShareModal(false);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleVideoPress = (video: VideoData) => {
    console.log('Video clicked:', video.id);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7459F0" />
      </View>
    );
  }

  if (!creator) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Profil introuvable</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalLikes = videos.reduce((sum, video) => sum + (video.likes || 0), 0);
  const totalViews = videos.reduce((sum, video) => sum + (video.views || 0), 0);
  const earnedBadges = BADGES_DATA.filter(b => creator.badges?.includes(b.id));
  const level = Math.ceil(((creator.stats?.videosWatched || 0) / 10) + 1);
  const progressToNextLevel = ((creator.stats?.videosWatched || 0) % 10) * 10;
  const sortedVideos = [...videos].sort((a, b) => b.likes - a.likes);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover with decorative circles */}
        <View style={styles.coverContainer}>
          <LinearGradient colors={['#7459F0', '#9D8DF1']} style={styles.coverGradient}>
            <View style={styles.decorativeCircles}>
              <View style={[styles.circle, styles.circle1]} />
              <View style={[styles.circle, styles.circle2]} />
              <View style={[styles.circle, styles.circle3]} />
            </View>
          </LinearGradient>
          
          <View style={styles.coverActions}>
            <TouchableOpacity style={styles.coverButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.coverButton} onPress={() => setShowShareModal(true)}>
              <Ionicons name="share-social" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileSection}>
          {/* Avatar with role badge */}
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarContainer}>
              {creator.profileImage ? (
                <Image source={{ uri: creator.profileImage }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {creator.firstName?.charAt(0)}{creator.lastName?.charAt(0)}
                  </Text>
                </View>
              )}
            </View>
            <View style={[styles.roleBadge, creator.role === 'formateur' ? styles.formateurBadge : styles.apprenantBadge]}>
              <Ionicons 
                name={creator.role === 'formateur' ? 'school' : 'trophy'} 
                size={12} 
                color={creator.role === 'formateur' ? '#7459F0' : '#FB923C'} 
              />
              <Text style={[styles.roleBadgeText, creator.role === 'formateur' ? styles.formateurText : styles.apprenantText]}>
                {creator.role === 'formateur' ? 'Formateur' : 'Apprenant'}
              </Text>
            </View>
          </View>

          {/* Name and Follow button */}
          <View style={styles.nameRow}>
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{creator.firstName} {creator.lastName}</Text>
              {creator.role === 'apprenant' && (
                <Text style={styles.level}>Niveau {level}</Text>
              )}
            </View>
            
            {currentUser?.uid !== id && (
              <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.followingButton]}
                onPress={handleFollow}
              >
                <Ionicons 
                  name={isFollowing ? 'checkmark' : 'person-add'} 
                  size={16} 
                  color={isFollowing ? '#7459F0' : '#fff'} 
                />
                <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                  {isFollowing ? 'Abonné' : 'Suivre'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bio */}
          {creator.bio && <Text style={styles.bio}>{creator.bio}</Text>}

          {/* Member since */}
          {creator.createdAt && (
            <Text style={styles.memberSince}>
              Membre depuis {new Date(creator.createdAt.toDate ? creator.createdAt.toDate() : creator.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </Text>
          )}

          {/* Stats - Different for formateur vs apprenant */}
          <View style={styles.statsGrid}>
            {creator.role === 'formateur' ? (
              <>
                <View style={styles.statCard}>
                  <Text style={[styles.statNumber, { color: '#7459F0' }]}>{videos.length}</Text>
                  <Text style={styles.statLabel}>Vidéos</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statNumber, { color: '#FB923C' }]}>
                    {totalLikes >= 1000 ? `${(totalLikes / 1000).toFixed(1)}k` : totalLikes}
                  </Text>
                  <Text style={styles.statLabel}>J'aime</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statNumber, { color: '#3B82F6' }]}>
                    {totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}k` : totalViews}
                  </Text>
                  <Text style={styles.statLabel}>Vues</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.statCard}>
                  <Text style={[styles.statNumber, { color: '#7459F0' }]}>{creator.stats?.videosWatched || 0}</Text>
                  <Text style={styles.statLabel}>Vues</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statNumber, { color: '#FB923C' }]}>{creator.stats?.streak || 0} 🔥</Text>
                  <Text style={styles.statLabel}>Série</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statNumber, { color: '#3B82F6' }]}>{earnedBadges.length}</Text>
                  <Text style={styles.statLabel}>Badges</Text>
                </View>
              </>
            )}
          </View>

          {/* Interests */}
          {creator.interests && creator.interests.length > 0 && (
            <View style={styles.interestsContainer}>
              {creator.interests.map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>#{interest}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <View style={styles.tabsList}>
              {creator.role === 'formateur' ? (
                <>
                  <TouchableOpacity 
                    style={[styles.tab, activeTab === 'videos' && styles.tabActive]}
                    onPress={() => setActiveTab('videos')}
                  >
                    <Text style={styles.tabEmoji}>🎬</Text>
                    <Text style={[styles.tabText, activeTab === 'videos' && styles.tabTextActive]}>
                      Vidéos ({videos.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.tab, activeTab === 'popular' && styles.tabActive]}
                    onPress={() => setActiveTab('popular')}
                  >
                    <Text style={styles.tabEmoji}>🔥</Text>
                    <Text style={[styles.tabText, activeTab === 'popular' && styles.tabTextActive]}>
                      Populaires
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity 
                    style={[styles.tab, activeTab === 'badges' && styles.tabActive]}
                    onPress={() => setActiveTab('badges')}
                  >
                    <Text style={styles.tabEmoji}>🏆</Text>
                    <Text style={[styles.tabText, activeTab === 'badges' && styles.tabTextActive]}>
                      Badges ({earnedBadges.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.tab, activeTab === 'activity' && styles.tabActive]}
                    onPress={() => setActiveTab('activity')}
                  >
                    <Text style={styles.tabEmoji}>📊</Text>
                    <Text style={[styles.tabText, activeTab === 'activity' && styles.tabTextActive]}>
                      Activité
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {/* Videos Tab - Formateur */}
            {creator.role === 'formateur' && activeTab === 'videos' && (
              <View style={styles.videosGrid}>
                {videos.map((video) => (
                  <TouchableOpacity
                    key={video.id}
                    style={styles.videoCard}
                    onPress={() => handleVideoPress(video)}
                  >
                    {video.thumbnailUrl ? (
                      <Image source={{ uri: video.thumbnailUrl }} style={styles.videoThumbnail} />
                    ) : (
                      <View style={styles.videoPlaceholder}>
                        <Ionicons name="play-circle" size={40} color="#7459F0" />
                      </View>
                    )}
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.8)']}
                      style={styles.videoGradient}
                    />
                    <View style={styles.videoInfo}>
                      <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
                      <View style={styles.videoStats}>
                        <Ionicons name="heart" size={12} color="#fff" />
                        <Text style={styles.videoStatText}>{video.likes}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Popular Tab - Formateur */}
            {creator.role === 'formateur' && activeTab === 'popular' && (
              <View style={styles.videosGrid}>
                {sortedVideos.map((video) => (
                  <TouchableOpacity
                    key={video.id}
                    style={styles.videoCard}
                    onPress={() => handleVideoPress(video)}
                  >
                    {video.thumbnailUrl ? (
                      <Image source={{ uri: video.thumbnailUrl }} style={styles.videoThumbnail} />
                    ) : (
                      <View style={styles.videoPlaceholder}>
                        <Ionicons name="play-circle" size={40} color="#7459F0" />
                      </View>
                    )}
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.8)']}
                      style={styles.videoGradient}
                    />
                    <View style={styles.videoInfo}>
                      <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
                      <Text style={styles.videoStatText}>🔥 {video.likes} likes</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Badges Tab - Apprenant */}
            {creator.role === 'apprenant' && activeTab === 'badges' && (
              <View style={styles.badgesContainer}>
                {earnedBadges.length > 0 ? (
                  <View style={styles.badgesGrid}>
                    {earnedBadges.map((badge) => (
                      <View key={badge.id} style={styles.badgeCard}>
                        <Text style={styles.badgeIcon}>{badge.icon}</Text>
                        <Text style={styles.badgeName}>{badge.name}</Text>
                        <Text style={styles.badgeDescription}>{badge.description}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🌱</Text>
                    <Text style={styles.emptyTitle}>Aucun badge débloqué</Text>
                    <Text style={styles.emptySubtitle}>Cet apprenant commence son voyage</Text>
                  </View>
                )}
              </View>
            )}

            {/* Activity Tab - Apprenant */}
            {creator.role === 'apprenant' && activeTab === 'activity' && (
              <View style={styles.activityContainer}>
                <View style={styles.activityCard}>
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityEmoji}>⏱️</Text>
                    <Text style={styles.activityTitle}>Temps d'apprentissage</Text>
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityNumber}>{creator.stats?.totalMinutes || 0}</Text>
                    <Text style={styles.activityLabel}>minutes totales</Text>
                  </View>
                </View>

                <View style={styles.activityCard}>
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityEmoji}>🎓</Text>
                    <Text style={styles.activityTitle}>Progression</Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                      <View style={[styles.progressBarFill, { width: `${progressToNextLevel}%` }]} />
                    </View>
                    <Text style={styles.progressText}>
                      En route vers le niveau {level + 1}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Partager le profil</Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Partagez le profil de {creator.firstName} {creator.lastName}</Text>
            
            <TouchableOpacity style={styles.shareOption} onPress={handleShare}>
              <View style={styles.shareIconContainer}>
                <Ionicons name="share-social" size={20} color="#7459F0" />
              </View>
              <Text style={styles.shareOptionText}>Partager le profil</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 32,
  },
  errorText: {
    color: '#000',
    fontSize: 18,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#7459F0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  coverContainer: {
    height: 160,
    position: 'relative',
  },
  coverGradient: {
    width: '100%',
    height: '100%',
  },
  decorativeCircles: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  circle1: {
    width: 120,
    height: 120,
    top: 30,
    left: 50,
  },
  circle2: {
    width: 160,
    height: 160,
    bottom: 20,
    right: -30,
  },
  circle3: {
    width: 80,
    height: 80,
    top: 20,
    right: 200,
  },
  coverActions: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coverButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    paddingHorizontal: 24,
    marginTop: -60,
  },
  avatarWrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#f4f4f5',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#7459F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  roleBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  formateurBadge: {
    backgroundColor: '#EDE9FE',
  },
  apprenantBadge: {
    backgroundColor: '#FED7AA',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  formateurText: {
    color: '#7459F0',
  },
  apprenantText: {
    color: '#FB923C',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 16,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#18181b',
  },
  level: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 2,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7459F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  followingButton: {
    backgroundColor: '#e4e4e7',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#52525b',
  },
  bio: {
    fontSize: 14,
    color: '#52525b',
    lineHeight: 20,
    marginTop: 8,
  },
  memberSince: {
    fontSize: 12,
    color: '#a1a1aa',
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 4,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 24,
  },
  interestTag: {
    backgroundColor: '#f4f4f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  interestText: {
    fontSize: 14,
    color: '#52525b',
  },
  tabsContainer: {
    marginTop: 32,
  },
  tabsList: {
    flexDirection: 'row',
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
    gap: 4,
  },
  tabActive: {
    backgroundColor: '#fff',
  },
  tabEmoji: {
    fontSize: 16,
  },
  tabText: {
    fontSize: 12,
    color: '#71717a',
  },
  tabTextActive: {
    color: '#18181b',
    fontWeight: '600',
  },
  tabContent: {
    marginTop: 24,
  },
  videosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  videoCard: {
    width: VIDEO_SIZE,
    height: VIDEO_SIZE * 1.6,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  videoInfo: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 4,
  },
  videoStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoStatText: {
    color: '#fff',
    fontSize: 12,
  },
  badgesContainer: {
    flex: 1,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  badgeIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B21A8',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 12,
    color: '#9333EA',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: '#fafafa',
    borderRadius: 12,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    color: '#52525b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  activityContainer: {
    gap: 16,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 12,
    padding: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  activityEmoji: {
    fontSize: 20,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#18181b',
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  activityNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#18181b',
  },
  activityLabel: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 4,
  },
  progressBarContainer: {
    gap: 8,
  },
  progressBarBackground: {
    width: '100%',
    height: 10,
    backgroundColor: '#f4f4f5',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#7459F0',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 12,
    color: '#71717a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#18181b',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 24,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#f4f4f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  shareIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FAF5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareOptionText: {
    fontSize: 16,
    color: '#18181b',
  },
});