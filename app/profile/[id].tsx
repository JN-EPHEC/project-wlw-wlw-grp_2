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
  arrayUnion, arrayRemove, increment, onSnapshot, getDoc 
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import CommentModal from '../../components/CommentModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Pour la grille de vidéos
const COLUMN_COUNT = 3;
const GRID_SPACING = 1;
const ITEM_WIDTH = (SCREEN_WIDTH - (GRID_SPACING * (COLUMN_COUNT - 1))) / COLUMN_COUNT;

// --- TYPES ---
interface UserData { 
  uid: string; prenom: string; nom: string; role: 'formateur' | 'apprenant'; bio?: string; photoURL?: string; followers?: string[]; following?: string[]; stats?: { videosWatched: number; }; 
}
interface VideoData { 
  id: string; title: string; videoUrl: string; thumbnail?: string; views: number; likes: number; comments: number; description?: string; creatorId: string; tags?: string[]; isPinned?: boolean; createdAt?: any; 
}

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid;

  const [profile, setProfile] = useState<UserData | null>(null);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // RÔLE & INTERACTIONS
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  
  // MES INTERACTIONS (Pour la synchro)
  const [myLikedVideos, setMyLikedVideos] = useState<Set<string>>(new Set());
  const [mySavedVideos, setMySavedVideos] = useState<Set<string>>(new Set());

  // PLAYER
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

    // 1. Récupérer mon rôle
    if (currentUserId) {
        getDoc(doc(db, 'users', currentUserId)).then(snap => {
            if (snap.exists()) setCurrentUserRole(snap.data().role);
        });
    }

    // 2. Écouter le profil visité
    const unsubProfile = onSnapshot(doc(db, 'users', id as string), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile({
                uid: id as string, prenom: data.prenom || 'Utilisateur', nom: data.nom || '', role: data.role || 'formateur', bio: data.bio || 'Membre', photoURL: data.photoURL || null, followers: data.followers || [], following: data.following || [], stats: data.stats
            });
            setFollowersCount(data.followers ? data.followers.length : 0);
        }
        setLoading(false);
    });

    // 3. Écouter mes interactions (Likes/Saves/Follow)
    let unsubMe = () => {};
    if (currentUserId) {
        unsubMe = onSnapshot(doc(db, 'users', currentUserId), (docSnap) => {
            if (docSnap.exists()) {
                const myData = docSnap.data();
                setIsFollowing((myData.following || []).includes(id));
                setMyLikedVideos(new Set(myData.likedVideos || []));
                setMySavedVideos(new Set(myData.favorites || []));
            }
        });
    }

    // 4. Charger les vidéos
    const loadVideos = async () => {
        try {
            const vQuery = query(collection(db, 'videos'), where('creatorId', '==', id));
            const vSnapshot = await getDocs(vQuery);
            const videosData = vSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as VideoData));
            videosData.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setVideos(videosData);
        } catch (e) { console.error(e); }
    };
    loadVideos();

    return () => { unsubProfile(); unsubMe(); };
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
    } catch (error) { Alert.alert("Info", "Action impossible"); }
  };

  // --- ACTIONS VIDEO ---
  const handleVideoLike = async () => {
      if (!currentUserId || !selectedVideo) return;
      const videoId = selectedVideo.id;
      const isLiked = myLikedVideos.has(videoId);
      
      // Mise à jour optimiste locale
      const newLikes = isLiked ? selectedVideo.likes - 1 : selectedVideo.likes + 1;
      setSelectedVideo({...selectedVideo, likes: newLikes});

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
          if (isSaved) await updateDoc(userRef, { favorites: arrayRemove(videoId) });
          else await updateDoc(userRef, { favorites: arrayUnion(videoId) });
      } catch (e) { console.error(e); }
  };

  const openVideo = (video: VideoData) => {
      setSelectedVideo(video);
      setShowPlayer(true);
      setIsPlaying(true);
      if (currentUserRole !== 'formateur') {
          updateDoc(doc(db, 'videos', video.id), { views: increment(1) }).catch(()=>{});
      }
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
  
  // VÉRIFICATION DYNAMIQUE DES ÉTATS
  const isVideoLiked = selectedVideo ? myLikedVideos.has(selectedVideo.id) : false;
  const isVideoSaved = selectedVideo ? mySavedVideos.has(selectedVideo.id) : false;
  const isViewerFormateur = currentUserRole === 'formateur';

  return (
    <View style={{flex: 1, backgroundColor: '#FFFFFF'}}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.headerWrapper}>
            <LinearGradient colors={['#9333ea', '#7e22ce']} style={styles.headerGradient}>
                <TouchableOpacity onPress={() => router.back()} style={styles.glassIcon}>
                    <Ionicons name="arrow-back" size={20} color="white" />
                </TouchableOpacity>
            </LinearGradient>
            <View style={styles.avatarSection}>
                <View style={styles.avatarBorder}>
                    {profile.photoURL ? <Image source={{ uri: profile.photoURL }} style={styles.avatarImg} /> : <View style={styles.avatarCircle}><Text style={styles.avatarInit}>{profile.prenom?.[0]}</Text></View>}
                </View>
            </View>
        </View>

        {/* INFOS */}
        <View style={styles.identitySection}>
            <Text style={styles.name}>{profile.prenom} {profile.nom}</Text>
            <Text style={styles.bio}>{profile.bio}</Text>
            <Text style={{color:'#666', marginTop:5}}>{followersCount} Abonnés</Text>
            
            {!isViewerFormateur && currentUserId !== profile.uid && (
                <TouchableOpacity style={[styles.modifyBtn, isFollowing && {backgroundColor:'#eee'}]} onPress={handleFollow}>
                    <Text style={[styles.modifyText, isFollowing && {color:'#333'}]}>{isFollowing ? "Abonné" : "S'abonner"}</Text>
                </TouchableOpacity>
            )}
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
            <View style={styles.statCard}><Text style={styles.statNum}>{totalViews}</Text><Text style={styles.statLabel}>Vues</Text></View>
            <View style={styles.statCard}><Text style={styles.statNum}>{totalLikes} ❤️</Text><Text style={styles.statLabel}>J'aime</Text></View>
            <View style={styles.statCard}><Text style={styles.statNum}>{videos.length}</Text><Text style={styles.statLabel}>Vidéos</Text></View>
        </View>

        {/* GRILLE VIDÉOS (AMÉLIORÉE) */}
        <View style={styles.contentSection}>
            <View style={styles.gridContainer}>
                {videos.map((video) => (
                    <TouchableOpacity key={video.id} style={styles.videoCard} onPress={() => openVideo(video)}>
                        {video.thumbnail ? (
                            <Image source={{ uri: video.thumbnail }} style={styles.videoThumb} resizeMode="cover" />
                        ) : (
                            <View style={styles.videoThumbPlaceholder}>
                                <Ionicons name="videocam" size={24} color="rgba(255,255,255,0.5)" />
                            </View>
                        )}
                        {/* Surcouche Play + Vues pour bien montrer que c'est une vidéo */}
                        <View style={styles.playOverlay}>
                            <Ionicons name="play" size={12} color="white" />
                            <Text style={styles.viewsText}>{video.views}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
      </ScrollView>

      {/* MODAL PLAYER (STYLE HOME) */}
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
                        {!isPlaying && <View style={styles.playIconContainer}><Ionicons name="play" size={80} color="rgba(255,255,255,0.6)" /></View>}
                    </TouchableOpacity>

                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gradientOverlay} />

                    <View style={styles.progressBarContainer}>
                        <View style={styles.progressBarBackground}>
                            <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
                        </View>
                    </View>

                    {/* GAUCHE : INFOS */}
                    <View style={styles.leftSide}>
                        <View style={styles.creatorRow}>
                            <View style={styles.miniAvatar}>
                                {profile?.photoURL ? <Image source={{uri: profile.photoURL}} style={styles.avatarSmall} /> : <Text style={styles.miniAvatarText}>{profile?.prenom?.[0]}</Text>}
                            </View>
                            <Text style={styles.creatorName}>@{profile?.prenom} {profile?.nom}</Text>
                        </View>
                        <Text style={styles.videoTitleFull}>{selectedVideo.title}</Text>
                        <Text style={styles.videoDescFull} numberOfLines={2}>{selectedVideo.description}</Text>
                    </View>

                    {/* DROITE : ACTIONS (Identiques Home) */}
                    <View style={styles.rightSide}>
                        {/* Avatar + Check/Plus */}
                        <View style={styles.rightAvatarContainer}>
                             <View style={styles.rightAvatarCircle}>
                                {profile?.photoURL ? <Image source={{uri: profile.photoURL}} style={{width:'100%', height:'100%'}} /> : <Text style={{color:'white', fontWeight:'bold'}}>{profile?.prenom?.[0]}</Text>}
                             </View>
                             {/* Toujours le check car on est sur le profil */}
                             <View style={[styles.plusIcon, {backgroundColor:'#10B981'}]}>
                                <Ionicons name="checkmark" size={12} color="white" />
                             </View>
                        </View>

                        {/* BOUTONS D'INTERACTION (Visibles car Apprenant) */}
                        {!isViewerFormateur && (
                            <>
                                <TouchableOpacity style={styles.actionBtn} onPress={handleVideoLike}>
                                    <Ionicons name={isVideoLiked ? "heart" : "heart-outline"} size={35} color={isVideoLiked ? "#EF4444" : "white"} />
                                    <Text style={styles.actionText}>{selectedVideo.likes}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.actionBtn} onPress={() => setShowComments(true)}>
                                    <Ionicons name="chatbubble-ellipses" size={35} color="white" />
                                    <Text style={styles.actionText}>{selectedVideo.comments || 0}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.actionBtn} onPress={handleVideoSave}>
                                    <Ionicons name={isVideoSaved ? "bookmark" : "bookmark-outline"} size={35} color={isVideoSaved ? "#FBA31A" : "white"} />
                                    <Text style={styles.actionText}>{isVideoSaved ? "Enregistré" : "Sauver"}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.actionBtn} onPress={()=>Alert.alert("Partage", "Lien copié !")}>
                                    <Ionicons name="share-social" size={35} color="white" />
                                    <Text style={styles.actionText}>Partager</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

                    <TouchableOpacity onPress={() => setShowPlayer(false)} style={styles.closePlayerBtn}>
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                </>
            )}
        </View>
      </Modal>

      {/* MODAL COMMENTAIRES */}
      {!isViewerFormateur && selectedVideo && (
        <CommentModal visible={showComments} videoId={selectedVideo.id} onClose={() => setShowComments(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  headerWrapper: { marginBottom: 60 },
  headerGradient: { height: 140, paddingTop: 50, paddingHorizontal: 20 },
  glassIcon: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 20, width: 40 },
  avatarSection: { position: 'absolute', bottom: -40, width: SCREEN_WIDTH, alignItems: 'center' },
  avatarBorder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#9333ea', justifyContent:'center', alignItems:'center', borderWidth:4, borderColor:'white' },
  avatarImg: { width: '100%', height: '100%', borderRadius: 50 },
  avatarCircle: { width: '100%', height: '100%', borderRadius: 50, backgroundColor:'#9333ea', justifyContent:'center', alignItems:'center' },
  avatarInit: { fontSize: 40, color:'white', fontWeight:'bold' },
  
  identitySection: { alignItems: 'center', marginTop: 10 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  bio: { color: '#666', textAlign: 'center', marginHorizontal: 20, marginVertical: 5 },
  modifyBtn: { marginTop: 10, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#9333ea' },
  modifyText: { color: 'white', fontWeight: 'bold' },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 20 },
  statCard: { alignItems: 'center' },
  statNum: { fontWeight: 'bold', fontSize: 18, color: '#4B5563' },
  statLabel: { color: '#9CA3AF', fontSize: 12 },
  
  // GRILLE VIDÉOS AMÉLIORÉE
  contentSection: { padding: 0 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', width: '100%' },
  videoCard: { 
    width: ITEM_WIDTH, 
    height: 180, // Hauteur fixe
    marginRight: GRID_SPACING, 
    marginBottom: GRID_SPACING, 
    backgroundColor: '#1a1a1a', // Fond sombre
    position: 'relative'
  },
  videoThumb: { width: '100%', height: '100%' },
  videoThumbPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  playOverlay: { position: 'absolute', bottom: 5, left: 5, flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewsText: { color: 'white', fontSize: 12, fontWeight: 'bold', textShadowColor:'rgba(0,0,0,0.8)', textShadowRadius:2 },

  // PLAYER STYLES (Identique Home)
  fullScreenContainer: { flex: 1, backgroundColor: 'black' },
  touchOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  playIconContainer: { opacity: 0.8 },
  gradientOverlay: { position: 'absolute', bottom: 0, width: '100%', height: 300, zIndex: 10 },
  progressBarContainer: { position: 'absolute', bottom: 50, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', zIndex: 40 },
  progressBarBackground: { flex: 1 },
  progressBarFill: { height: '100%', backgroundColor: '#9333ea' },
  
  leftSide: { position: 'absolute', bottom: 80, left: 20, width: '70%', zIndex: 30 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  miniAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'white', marginRight: 10, overflow:'hidden', backgroundColor:'#9333ea', justifyContent:'center', alignItems:'center' },
  miniAvatarText: { color:'white', fontWeight:'bold' },
  creatorName: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  videoTitleFull: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  videoDescFull: { color: '#ddd', fontSize: 14 },
  
  rightSide: { position: 'absolute', bottom: 100, right: 10, alignItems: 'center', gap: 20, zIndex: 30 },
  rightAvatarContainer: { marginBottom: 15, alignItems: 'center' },
  rightAvatarCircle: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: 'white', justifyContent: 'center', alignItems: 'center', backgroundColor: '#9333ea', overflow:'hidden' },
  avatarSmall: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: 'white' },
  plusIcon: { position: 'absolute', bottom: -10, alignSelf: 'center', width: 22, height: 22, borderRadius: 11, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  
  actionBtn: { alignItems: 'center', gap: 4 },
  actionText: { color: 'white', fontSize: 12, fontWeight: 'bold', textShadowColor:'rgba(0,0,0,0.5)', textShadowRadius:2 },
  closePlayerBtn: { position: 'absolute', top: 50, left: 20, padding: 10, zIndex: 50 },
});