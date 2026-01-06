import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, useWindowDimensions, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator, TouchableWithoutFeedback, StatusBar, Image,
  Modal, TextInput, Platform, Linking, FlatList, Clipboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { 
  collection, getDocs, query, orderBy, limit, doc, updateDoc, 
  increment, arrayUnion, arrayRemove, getDoc, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import CommentModal from '../../components/CommentModal';

// --- INTERFACES ---
interface VideoData {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  videoUrl: string;
  likes: number;
  comments: number;
  creatorBadge?: 'apprenant' | 'expert' | 'pro';
}

interface UserProfile {
  uid: string;
  displayName?: string;
  photoURL?: string;
  badge?: string;
  prenom?: string;
  nom?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedVideosSet, setLikedVideosSet] = useState<Set<string>>(new Set());
  const [savedVideosSet, setSavedVideosSet] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // États Partage & Commentaires
  const [showComments, setShowComments] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showUsersList, setShowUsersList] = useState(false);
  const [selectedVideoForShare, setSelectedVideoForShare] = useState<VideoData | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const videoRefs = useRef<Record<string, Video | null>>({});

  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        const user = auth.currentUser;
        if (!user) return;
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserProfile(data);
          setLikedVideosSet(new Set(data.likedVideos || []));
          setSavedVideosSet(new Set(data.favorites || []));
        }
      };
      fetchUserData();
      setIsPlaying(true);
      return () => setIsPlaying(false);
    }, [currentIndex])
  );

  useEffect(() => { loadVideos(); }, []);

  const loadVideos = async () => {
    try {
      const snapshot = await getDocs(query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(20)));
      const rawVideos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      const enriched = await Promise.all(rawVideos.map(async (v) => {
        const uDoc = await getDoc(doc(db, 'users', v.creatorId));
        const uData = uDoc.exists() ? uDoc.data() : {};
        return { ...v, 
          creatorName: uData.displayName || `${uData.prenom || ''} ${uData.nom || ''}`.trim() || 'Formateur',
          creatorAvatar: uData.photoURL || null,
          creatorBadge: uData.role === 'formateur' ? 'expert' : 'apprenant'
        };
      }));
      setVideos(enriched);
      if (enriched.length > 0) handleMarkAsWatched(enriched[0].id);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleMarkAsWatched = async (videoId: string) => {
    const user = auth.currentUser;
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), { watchHistory: arrayUnion(videoId), lastWatchedAt: serverTimestamp() });
    await updateDoc(doc(db, 'videos', videoId), { views: increment(1) });
  };

  const togglePlayPause = async () => {
    const ref = videoRefs.current[videos[currentIndex]?.id];
    if (ref) {
      isPlaying ? await ref.pauseAsync() : await ref.playAsync();
      setIsPlaying(!isPlaying);
    }
  };

  const handleLike = async (videoId: string) => {
    const isLiked = likedVideosSet.has(videoId);
    setLikedVideosSet(prev => { const s = new Set(prev); isLiked ? s.delete(videoId) : s.add(videoId); return s; });
    await updateDoc(doc(db, 'videos', videoId), { likes: increment(isLiked ? -1 : 1) });
    await updateDoc(doc(db, 'users', auth.currentUser!.uid), { likedVideos: isLiked ? arrayRemove(videoId) : arrayUnion(videoId) });
  };

  const handleFavorite = async (videoId: string) => {
    const isSaved = savedVideosSet.has(videoId);
    setSavedVideosSet(prev => { const s = new Set(prev); isSaved ? s.delete(videoId) : s.add(videoId); return s; });
    await updateDoc(doc(db, 'users', auth.currentUser!.uid), { favorites: isSaved ? arrayRemove(videoId) : arrayUnion(videoId) });
    Alert.alert("Favoris", isSaved ? "Retiré des favoris" : "Ajouté aux favoris !");
  };

  // --- LOGIQUE PARTAGE (STYLE FORMATEUR) ---
  const handleOpenShare = async (video: VideoData) => {
    setSelectedVideoForShare(video);
    setShowShareModal(true);
    const usersSnap = await getDocs(collection(db, 'users'));
    setAllUsers(usersSnap.docs.map(d => ({ uid: d.id, ...d.data() })).filter(u => u.uid !== auth.currentUser?.uid));
  };

  const shareWhatsApp = () => {
    const msg = `Découvre cette vidéo "${selectedVideoForShare?.title}" sur SwipeSkills !`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`);
  };

  const copyLink = () => {
    Clipboard.setString(`https://swipeskills.app/video/${selectedVideoForShare?.id}`);
    Alert.alert("Lien copié !");
    setShowShareModal(false);
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#7459f0" /></View>;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        pagingEnabled showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.y / SCREEN_HEIGHT);
          if (index !== currentIndex) { 
            setCurrentIndex(index); setProgress(0); setIsPlaying(true);
            handleMarkAsWatched(videos[index].id);
          }
        }}
        scrollEventThrottle={16} snapToInterval={SCREEN_HEIGHT} decelerationRate="fast"
      >
        {videos.map((video, index) => {
          const isLiked = likedVideosSet.has(video.id);
          const isSaved = savedVideosSet.has(video.id);
          const isFollowing = userProfile?.following?.includes(video.creatorId);
          
          return (
            <View key={video.id} style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
              <Video
                ref={(ref) => { videoRefs.current[video.id] = ref; }}
                source={{ uri: video.videoUrl }}
                resizeMode={ResizeMode.COVER}
                shouldPlay={index === currentIndex && isPlaying}
                isLooping style={StyleSheet.absoluteFillObject}
                onPlaybackStatusUpdate={(s) => index === currentIndex && s.isLoaded && (setProgress(s.positionMillis), setDuration(s.durationMillis || 0))}
              />
              
              <TouchableWithoutFeedback onPress={togglePlayPause}>
                <View style={styles.touchableOverlay}>
                  {!isPlaying && index === currentIndex && <Ionicons name="play" size={80} color="rgba(255,255,255,0.8)" />}
                </View>
              </TouchableWithoutFeedback>

              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.bottomGradient} />

              {index === currentIndex && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBg}>
                    <LinearGradient colors={['#7459f0', '#9333ea', '#242A65']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }]} />
                  </View>
                </View>
              )}

              <View style={styles.leftSide}>
                <View style={styles.creatorHeader}>
                  <TouchableOpacity style={styles.avatarWrapper} onPress={() => router.push(`/profile/${video.creatorId}`)}>
                    <Image source={{ uri: video.creatorAvatar || 'https://via.placeholder.com/150' }} style={styles.avatar} />
                  </TouchableOpacity>
                  <View style={styles.creatorTextInfo}>
                    <Text style={styles.creatorName}>@{video.creatorName}</Text>
                    {video.creatorBadge === 'expert' && <View style={styles.expertBadge}><Text style={styles.expertText}>EXPERT</Text></View>}
                  </View>
                </View>
                <Text style={styles.videoTitle}>{video.title}</Text>
                <Text style={styles.videoDesc} numberOfLines={2}>{video.description}</Text>
              </View>

              <View style={styles.rightSide}>
                <TouchableOpacity style={styles.profileAction} onPress={() => router.push(`/profile/${video.creatorId}`)}>
                  <View style={styles.profileCircle}><Image source={{ uri: video.creatorAvatar || 'https://via.placeholder.com/150' }} style={styles.profileImg} /></View>
                  <View style={[styles.plusBadge, { backgroundColor: isFollowing ? '#10B981' : '#EF4444' }]}><Ionicons name={isFollowing ? "checkmark" : "add"} size={12} color="white" /></View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(video.id)}>
                  <LinearGradient colors={isLiked ? ['#ef4444', '#dc2626'] : ['#7459f0', '#242A65']} style={styles.actionCircle}><Ionicons name={isLiked ? "heart" : "heart-outline"} size={28} color="white" /></LinearGradient>
                  <Text style={styles.actionCount}>{video.likes}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => { setSelectedVideoId(video.id); setShowComments(true); }}>
                  <LinearGradient colors={['#7459f0', '#242A65']} style={styles.actionCircle}><Ionicons name="chatbubble-outline" size={26} color="white" /></LinearGradient>
                  <Text style={styles.actionCount}>{video.comments || 0}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => handleFavorite(video.id)}>
                  <LinearGradient colors={isSaved ? ['#FBA31A', '#F59E0B'] : ['#7459f0', '#242A65']} style={styles.actionCircle}><Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={26} color="white" /></LinearGradient>
                  <Text style={styles.actionCount}>{isSaved ? 'Favoris' : 'Sauver'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenShare(video)}>
                  <LinearGradient colors={['#7459f0', '#242A65']} style={styles.actionCircle}><Ionicons name="share-social-outline" size={26} color="white" /></LinearGradient>
                  <Text style={styles.actionCount}>Partager</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* MODAL PARTAGE IDENTIQUE FORMATEUR */}
      <Modal visible={showShareModal} transparent animationType="fade">
        <TouchableOpacity style={styles.shareOverlay} activeOpacity={1} onPress={() => setShowShareModal(false)}>
          <View style={styles.shareContent}>
            <LinearGradient colors={['#7459f0', '#9333ea']} style={styles.shareHeader}><Text style={styles.shareTitle}>Partager</Text></LinearGradient>
            <View style={styles.shareOptionsGrid}>
              <TouchableOpacity style={styles.shareOption} onPress={shareWhatsApp}><Ionicons name="logo-whatsapp" size={40} color="#25D366" /><Text>WhatsApp</Text></TouchableOpacity>
              <TouchableOpacity style={styles.shareOption} onPress={() => { setShowShareModal(false); setShowUsersList(true); }}><Ionicons name="people" size={40} color="#7459f0" /><Text>Utilisateurs</Text></TouchableOpacity>
              <TouchableOpacity style={styles.shareOption} onPress={copyLink}><Ionicons name="link" size={40} color="#3B82F6" /><Text>Lien</Text></TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL COMMENTAIRES FIX */}
      {selectedVideoId && (
        <CommentModal 
          visible={showComments} videoId={selectedVideoId} 
          creatorId={videos.find(v => v.id === selectedVideoId)?.creatorId || ''}
          videoTitle={videos.find(v => v.id === selectedVideoId)?.title || 'Vidéo'}
          onClose={() => setShowComments(false)} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A2E' },
  touchableOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 5 },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', zIndex: 10 },
  progressContainer: { position: 'absolute', bottom: 90, left: 20, right: 20, zIndex: 40 },
  progressBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  leftSide: { position: 'absolute', bottom: 120, left: 20, right: 100, zIndex: 30 },
  creatorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatarWrapper: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', overflow:'hidden' },
  avatar: { width: '100%', height: '100%' },
  creatorTextInfo: { gap: 4, marginLeft: 12 },
  creatorName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  expertBadge: { backgroundColor: '#FBA31A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  expertText: { color: '#000', fontSize: 9, fontWeight: '900' },
  videoTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  videoDesc: { color: '#fff', fontSize: 14, lineHeight: 20 },
  rightSide: { position: 'absolute', bottom: 120, right: 16, gap: 24, alignItems: 'center', zIndex: 30 },
  profileAction: { marginBottom: 8, position: 'relative' },
  profileCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', overflow: 'hidden' },
  profileImg: { width: '100%', height: '100%' },
  plusBadge: { position: 'absolute', bottom: -4, alignSelf: 'center', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  actionCount: { color: '#fff', fontSize: 12, fontWeight: '600' },
  shareOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  shareContent: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
  shareHeader: { padding: 15, alignItems: 'center' },
  shareTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  shareOptionsGrid: { flexDirection: 'row', justifyContent: 'space-around', padding: 30 },
  shareOption: { alignItems: 'center', gap: 10 }
});