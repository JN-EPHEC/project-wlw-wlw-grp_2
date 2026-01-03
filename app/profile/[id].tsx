import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Dimensions, ActivityIndicator, Alert, Modal, StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { 
  doc, collection, query, where, getDocs, updateDoc, 
  arrayUnion, arrayRemove, increment, onSnapshot 
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import CommentModal from '../../components/CommentModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- TYPES ---
interface UserData {
  uid: string;
  prenom: string;
  nom: string;
  role: 'formateur' | 'apprenant';
  bio?: string;
  photoURL?: string;
  followers?: string[];
  following?: string[];
  stats?: { videosWatched: number; }; 
}

interface VideoData {
  id: string;
  title: string;
  videoUrl: string;
  thumbnail?: string;
  views: number;
  likes: number;
  comments: number;
  description?: string;
  creatorId: string;
  tags?: string[];
  isPinned?: boolean;
  createdAt?: any;
}

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid;

  const [profile, setProfile] = useState<UserData | null>(null);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [myLikedVideos, setMyLikedVideos] = useState<Set<string>>(new Set());
  const [mySavedVideos, setMySavedVideos] = useState<Set<string>>(new Set());

  // Player & Commentaires
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const [showComments, setShowComments] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<Video>(null);

  const totalViews = videos.reduce((acc, curr) => acc + (curr.views || 0), 0);
  const totalLikes = videos.reduce((acc, curr) => acc + (curr.likes || 0), 0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const unsubProfile = onSnapshot(doc(db, 'users', id as string), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile({
                uid: id as string,
                prenom: data.prenom || 'Utilisateur',
                nom: data.nom || '',
                role: data.role || 'formateur',
                bio: data.bio || 'Membre de SwipeSkills',
                photoURL: data.photoURL || null,
                followers: data.followers || [],
                following: data.following || [],
                stats: data.stats
            });
            setFollowersCount(data.followers ? data.followers.length : 0);
        }
        setLoading(false);
    });

    let unsubMe = () => {};
    if (currentUserId) {
        unsubMe = onSnapshot(doc(db, 'users', currentUserId), (docSnap) => {
            if (docSnap.exists()) {
                const myData = docSnap.data();
                const myFollowing = myData.following || [];
                setIsFollowing(myFollowing.includes(id));
                setMyLikedVideos(new Set(myData.likedVideos || []));
                setMySavedVideos(new Set(myData.favorites || []));
            }
        });
    }

    const loadVideos = async () => {
        try {
            const vQuery = query(collection(db, 'videos'), where('creatorId', '==', id));
            const vSnapshot = await getDocs(vQuery);
            const videosData = vSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as VideoData));
            videosData.sort((a: any, b: any) => {
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
            });
            setVideos(videosData);
        } catch (e) { console.error(e); }
    };
    loadVideos();

    return () => {
        unsubProfile();
        unsubMe();
    };
  }, [id, currentUserId]);

  const handleFollow = async () => {
    if (!currentUserId || !profile) return;
    try {
      const myRef = doc(db, 'users', currentUserId);
      const targetRef = doc(db, 'users', profile.uid);
      if (isFollowing) {
        await updateDoc(myRef, { following: arrayRemove(profile.uid) });
        await updateDoc(targetRef, { followers: arrayRemove(currentUserId) });
      } else {
        await updateDoc(myRef, { following: arrayUnion(profile.uid) });
        await updateDoc(targetRef, { followers: arrayUnion(currentUserId) });
      }
    } catch (error) { Alert.alert("Erreur", "Impossible de modifier l'abonnement."); }
  };

  const handleVideoLike = async () => {
      if (!currentUserId || !selectedVideo) return;
      const videoId = selectedVideo.id;
      const isLiked = myLikedVideos.has(videoId);
      
      const newLikesCount = isLiked ? selectedVideo.likes - 1 : selectedVideo.likes + 1;
      setSelectedVideo({...selectedVideo, likes: newLikesCount});
      setVideos(prev => prev.map(v => v.id === videoId ? {...v, likes: newLikesCount} : v));

      try {
          const userRef = doc(db, 'users', currentUserId);
          const videoRef = doc(db, 'videos', videoId);
          if (isLiked) {
              await updateDoc(userRef, { likedVideos: arrayRemove(videoId) });
              await updateDoc(videoRef, { likes: increment(-1) });
          } else {
              await updateDoc(userRef, { likedVideos: arrayUnion(videoId) });
              await updateDoc(videoRef, { likes: increment(1) });
          }
      } catch (e) { console.error(e); }
  };

  const handleVideoSave = async () => {
      if (!currentUserId || !selectedVideo) return;
      const videoId = selectedVideo.id;
      const isSaved = mySavedVideos.has(videoId);
      try {
          const userRef = doc(db, 'users', currentUserId);
          if (isSaved) {
              await updateDoc(userRef, { favorites: arrayRemove(videoId) });
          } else {
              await updateDoc(userRef, { favorites: arrayUnion(videoId) });
          }
      } catch (e) { console.error(e); }
  };

  const handleOpenComments = () => {
      setShowComments(true);
  };

  const openVideo = (video: VideoData) => {
      setSelectedVideo(video);
      setShowPlayer(true);
      setIsPlaying(true);
      updateDoc(doc(db, 'videos', video.id), { views: increment(1) }).catch(()=>{});
  };

  const togglePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) { await videoRef.current.pauseAsync(); setIsPlaying(false); }
      else { await videoRef.current.playAsync(); setIsPlaying(true); }
    }
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setProgress(status.positionMillis);
      setDuration(status.durationMillis || 0);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#9333ea" /></View>;
  if (!profile) return <View style={styles.center}><Text>Profil introuvable.</Text></View>;

  const progressPercentage = duration > 0 ? (progress / duration) * 100 : 0;
  const isVideoLiked = selectedVideo ? myLikedVideos.has(selectedVideo.id) : false;
  const isVideoSaved = selectedVideo ? mySavedVideos.has(selectedVideo.id) : false;

  return (
    <View style={{flex: 1, backgroundColor: '#FFFFFF'}}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.headerWrapper}>
            <LinearGradient colors={['#9333ea', '#7e22ce']} style={styles.headerGradient}>
                <View style={styles.topIcons}>
                    <TouchableOpacity style={styles.glassIcon} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.glassIcon}>
                        <Ionicons name="share-social-outline" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>
            <View style={styles.avatarSection}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatarBorder}>
                        {profile.photoURL ? (
                            <Image source={{ uri: profile.photoURL }} style={styles.avatarImg} />
                        ) : (
                            <View style={styles.avatarCircle}>
                                <Text style={styles.avatarInit}>{profile.prenom?.[0] || 'U'}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.roleBadge}>
                        <Ionicons name="school" size={10} color="#9333ea" />
                        <Text style={styles.roleText}>Formateur</Text>
                    </View>
                </View>
            </View>
        </View>

        {/* INFOS */}
        <View style={styles.identitySection}>
            <Text style={styles.name}>{profile.prenom} {profile.nom}</Text>
            <Text style={styles.bio}>{profile.bio}</Text>
            <Text style={{color:'#6B7280', fontSize:12, marginTop:4}}>
                <Text style={{fontWeight:'bold', color:'#333'}}>{followersCount}</Text> Abonnés
            </Text>
            {currentUserId !== profile.uid && (
                <TouchableOpacity 
                    style={[styles.modifyBtn, isFollowing && {backgroundColor:'#E5E7EB', borderColor:'#D1D5DB'}]} 
                    onPress={handleFollow}
                >
                    <Ionicons name={isFollowing ? "checkmark" : "person-add-outline"} size={16} color={isFollowing ? "#374151" : "#9333ea"} />
                    <Text style={[styles.modifyText, isFollowing && {color:'#374151'}]}>
                        {isFollowing ? "Abonné" : "S'abonner"}
                    </Text>
                </TouchableOpacity>
            )}
        </View>

        {/* STATS & GRID */}
        <View style={styles.statsRow}>
            <View style={styles.statCard}><Text style={styles.statNum}>{totalViews}</Text><Text style={styles.statLabel}>Vues</Text></View>
            <View style={styles.statCard}><Text style={styles.statNum}>{totalLikes} ❤️</Text><Text style={styles.statLabel}>J'aime</Text></View>
            <View style={styles.statCard}><Text style={styles.statNum}>{videos.length}</Text><Text style={styles.statLabel}>Vidéos</Text></View>
        </View>
        
        <View style={styles.contentSection}>
            <Text style={{fontSize:16, fontWeight:'bold', marginBottom:15, marginLeft:5}}>Vidéos</Text>
            <View style={styles.gridContainer}>
                {videos.map((video) => (
                    <TouchableOpacity key={video.id} style={[styles.videoCard, video.isPinned && styles.videoCardPinned]} onPress={() => openVideo(video)}>
                        <View style={styles.videoThumb}>
                            {video.thumbnail ? (
                                <Image source={{ uri: video.thumbnail }} style={styles.thumbImage} resizeMode="cover" />
                            ) : (
                                <View style={[styles.center, {backgroundColor:'#333'}]}><Ionicons name="play-circle" size={30} color="white" /></View>
                            )}
                            <View style={styles.overlayBottomRight}>
                                <Ionicons name="play" size={10} color="white" />
                                <Text style={styles.overlayTextSm}>{video.views}</Text>
                            </View>
                        </View>
                        <Text numberOfLines={1} style={styles.videoTitle}>{video.title}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
        <View style={{height: 50}} />
      </ScrollView>

      {/* MODAL PLAYER */}
      <Modal visible={showPlayer && selectedVideo !== null} animationType="slide" transparent={false} onRequestClose={() => setShowPlayer(false)}>
        <View style={styles.fullScreenContainer}>
            <StatusBar hidden />
            {selectedVideo && (
                <>
                    <Video
                        ref={videoRef}
                        source={{ uri: selectedVideo.videoUrl }}
                        style={StyleSheet.absoluteFill}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={true}
                        isLooping
                        useNativeControls={false}
                        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                    />

                    <TouchableOpacity activeOpacity={1} onPress={togglePlayPause} style={styles.touchOverlay}>
                        {!isPlaying && (
                            <View style={styles.playIconContainer}><Ionicons name="play" size={80} color="rgba(255,255,255,0.6)" /></View>
                        )}
                    </TouchableOpacity>

                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gradientOverlay} />

                    <View style={styles.progressBarContainer}>
                        <View style={styles.progressBarBackground}>
                            <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
                        </View>
                    </View>

                    {/* GAUCHE */}
                    <View style={styles.leftSide}>
                        <View style={styles.creatorRow}>
                            <View style={styles.miniAvatar}>
                                {profile?.photoURL ? (
                                    <Image source={{uri: profile.photoURL}} style={{width:'100%', height:'100%'}} />
                                ) : (
                                    <Text style={styles.miniAvatarText}>{profile?.prenom?.[0]}</Text>
                                )}
                            </View>
                            <Text style={styles.creatorName}>@{profile?.prenom} {profile?.nom}</Text>
                        </View>
                        <Text style={styles.videoTitleFull} numberOfLines={1}>{selectedVideo.title}</Text>
                        <Text style={styles.videoDescFull} numberOfLines={2}>{selectedVideo.description}</Text>
                    </View>

                    {/* DROITE */}
                    <View style={styles.rightSide}>
                        <View style={styles.rightAvatarContainer}>
                            <View style={styles.rightAvatarCircle}>
                                {profile?.photoURL ? (
                                    <Image source={{uri: profile.photoURL}} style={{width:'100%', height:'100%'}} />
                                ) : (
                                    <Text style={{color:'white', fontWeight:'bold'}}>{profile?.prenom?.[0]}</Text>
                                )}
                            </View>
                            {isFollowing ? (
                                <View style={[styles.plusIcon, {backgroundColor:'#10B981'}]}>
                                    <Ionicons name="checkmark" size={12} color="white" />
                                </View>
                            ) : (
                                <View style={styles.plusIcon}><Ionicons name="add" size={14} color="white" /></View>
                            )}
                        </View>

                        <TouchableOpacity style={styles.actionBtn} onPress={handleVideoLike}>
                            <Ionicons name={isVideoLiked ? "heart" : "heart-outline"} size={35} color={isVideoLiked ? "#EF4444" : "white"} />
                            <Text style={styles.actionText}>{selectedVideo.likes}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn} onPress={handleOpenComments}>
                            <Ionicons name="chatbubble-ellipses" size={35} color="white" />
                            <Text style={styles.actionText}>{selectedVideo.comments || 0}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn} onPress={handleVideoSave}>
                             <Ionicons name={isVideoSaved ? "bookmark" : "bookmark-outline"} size={35} color={isVideoSaved ? "#FBA31A" : "white"} />
                             <Text style={styles.actionText}>{isVideoSaved ? "Enregistré" : "Sauver"}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn}>
                            <Ionicons name="share-social" size={35} color="white" />
                            <Text style={styles.actionText}>Partager</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={() => setShowPlayer(false)} style={styles.closePlayerBtn}>
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                </>
            )}
        </View>
      </Modal>

      {/* MODAL COMMENTAIRES */}
      {selectedVideo && (
        <CommentModal 
            visible={showComments} 
            videoId={selectedVideo.id} 
            onClose={() => setShowComments(false)} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerWrapper: { marginBottom: 60 },
  headerGradient: { height: 140, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingTop: 50, paddingHorizontal: 20 },
  topIcons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  glassIcon: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 20 },
  avatarSection: { position: 'absolute', bottom: -40, width: SCREEN_WIDTH, alignItems: 'center' },
  avatarContainer: { position: 'relative' },
  avatarBorder: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#FFF', backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  avatarImg: { width: '100%', height: '100%', borderRadius: 50 },
  avatarCircle: { width: '100%', height: '100%', borderRadius: 50, backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center' },
  avatarInit: { fontSize: 40, color: '#FFF', fontWeight: 'bold' },
  roleBadge: { position: 'absolute', bottom: -5, alignSelf: 'center', backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  roleText: { fontSize: 10, fontWeight: 'bold', color: '#9333ea', marginLeft: 4 },
  identitySection: { alignItems: 'center', marginTop: 10, paddingHorizontal: 20 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  bio: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4 },
  modifyBtn: { marginTop: 12, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 24, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  modifyText: { fontSize: 13, color: '#333', fontWeight: '600', marginLeft: 6 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 20 },
  statCard: { width: '31%', backgroundColor: '#FFF', padding: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6', elevation: 1 },
  statNum: { fontSize: 18, fontWeight: 'bold', color: '#4B5563' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  contentSection: { padding: 20 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emptyCard: { padding: 40, alignItems: 'center', width: '100%' },
  emptyText: { color: '#71717A' },
  videoCard: { width: '48%', marginBottom: 15 },
  videoCardPinned: { borderColor: '#9333ea', borderWidth: 2, borderRadius: 14 },
  videoThumb: { width: '100%', height: 120, backgroundColor: '#333', borderRadius: 12, overflow: 'hidden', position: 'relative' },
  thumbImage: { width: '100%', height: '100%' },
  pinBadge: { position: 'absolute', top: 5, left: 5, backgroundColor: '#9333ea', padding: 4, borderRadius: 4 },
  overlayBottomRight: { position: 'absolute', bottom: 5, right: 5, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  overlayTextSm: { color: 'white', fontSize: 10, marginLeft: 3 },
  videoInfoBlock: { padding: 5 },
  videoTitle: { fontSize: 12, fontWeight: '600', color: '#374151' },
  
  // PLAYER STYLES COPIÉS DE HOME
  fullScreenContainer: { flex: 1, backgroundColor: 'black' },
  touchOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  playIconContainer: { opacity: 0.8 },
  gradientOverlay: { position: 'absolute', bottom: 0, width: '100%', height: 300 },
  progressBarContainer: { position: 'absolute', bottom: 80, left: 0, right: 0, paddingHorizontal: 16, zIndex: 40 },
  progressBarBackground: { height: 2, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#9333ea', borderRadius: 1 },
  leftSide: { position: 'absolute', bottom: 100, left: 16, width: '70%', zIndex: 30 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  miniAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'white', marginRight: 10, overflow:'hidden', backgroundColor:'#9333ea', justifyContent:'center', alignItems:'center' },
  miniAvatarText: { color:'white', fontWeight:'bold' },
  creatorName: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  videoTitleFull: { color: 'white', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  videoDescFull: { color: '#ddd', fontSize: 14, marginBottom: 8, lineHeight: 20 },
  rightSide: { position: 'absolute', bottom: 100, right: 10, alignItems: 'center', gap: 20, zIndex: 30 },
  rightAvatarContainer: { marginBottom: 10, alignItems:'center' },
  rightAvatarCircle: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: 'white', justifyContent: 'center', alignItems: 'center', backgroundColor: '#9333ea', overflow:'hidden' },
  plusIcon: { position: 'absolute', bottom: -5, left: 15, backgroundColor: '#EF4444', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionText: { color: 'white', fontSize: 12, marginTop: 4, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 },
  closePlayerBtn: { position: 'absolute', top: 50, left: 20, padding: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, zIndex: 999 },
});