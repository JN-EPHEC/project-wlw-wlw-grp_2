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

// Import du modal et du service de notification
import CommentModal from '../../components/CommentModal';
import { sendNotification } from '../../app/utils/notificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const GRID_SPACING = 1;
const ITEM_WIDTH = (SCREEN_WIDTH - (GRID_SPACING * (COLUMN_COUNT - 1))) / COLUMN_COUNT;

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
  
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>(""); 
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  
  const [myLikedVideos, setMyLikedVideos] = useState<Set<string>>(new Set());
  const [mySavedVideos, setMySavedVideos] = useState<Set<string>>(new Set());

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

    if (currentUserId) {
        getDoc(doc(db, 'users', currentUserId)).then(snap => {
            if (snap.exists()) {
              const data = snap.data();
              setCurrentUserRole(data.role);
              setCurrentUserName(`${data.prenom} ${data.nom}`);
            }
        });
    }

    const unsubProfile = onSnapshot(doc(db, 'users', id as string), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile({ uid: id as string, ...data } as UserData);
            setFollowersCount(data.followers ? data.followers.length : 0);
        }
        setLoading(false);
    });

    if (currentUserId) {
        onSnapshot(doc(db, 'users', currentUserId), (docSnap) => {
            if (docSnap.exists()) {
                const myData = docSnap.data();
                setIsFollowing((myData.following || []).includes(id));
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
            videosData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setVideos(videosData);
        } catch (e) { console.error(e); }
    };
    loadVideos();

    return () => unsubProfile();
  }, [id, currentUserId]);

  // --- LOGIQUE ENVOI MESSAGE ---
  const handleMessage = () => {
    if (!profile) return;
    // Redirection vers votre stack de chat existante
    router.push({
      pathname: "/chat/conversation" as any, // "as any" pour éviter l'erreur de type
      params: { 
        recipientId: profile.uid, 
        recipientName: `${profile.prenom} ${profile.nom}` 
      }
    });
  };

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
        await sendNotification(profile.uid, 'follow', { senderName: currentUserName, senderId: currentUserId });
      }
    } catch (error) { Alert.alert("Info", "Action impossible"); }
  };

  const handleVideoLike = async () => {
      if (!currentUserId || !selectedVideo) return;
      const isLiked = myLikedVideos.has(selectedVideo.id);
      try {
          const videoRef = doc(db, 'videos', selectedVideo.id);
          const userRef = doc(db, 'users', currentUserId);
          if (isLiked) {
              await updateDoc(userRef, { likedVideos: arrayRemove(selectedVideo.id) });
              await updateDoc(videoRef, { likes: increment(-1) });
          } else {
              await updateDoc(userRef, { likedVideos: arrayUnion(selectedVideo.id) });
              await updateDoc(videoRef, { likes: increment(1) });
              await sendNotification(selectedVideo.creatorId, 'like', { videoId: selectedVideo.id, videoTitle: selectedVideo.title, senderName: currentUserName, senderId: currentUserId });
          }
      } catch (e) { console.error(e); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#9333ea" /></View>;
  if (!profile) return <View style={styles.center}><Text>Profil introuvable.</Text></View>;

  return (
    <View style={{flex: 1, backgroundColor: '#FFFFFF'}}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerWrapper}>
            <LinearGradient colors={['#9333ea', '#7e22ce']} style={styles.headerGradient}>
                <TouchableOpacity onPress={() => router.back()} style={styles.glassIcon}>
                    <Ionicons name="arrow-back" size={20} color="white" />
                </TouchableOpacity>
            </LinearGradient>
            <View style={styles.avatarSection}>
                <View style={styles.avatarBorder}>
                    {profile.photoURL ? <Image source={{ uri: profile.photoURL }} style={styles.avatarImg} /> :
                    <View style={styles.avatarCircle}><Text style={styles.avatarInit}>{profile.prenom?.[0]}</Text></View>}
                </View>
            </View>
        </View>

        <View style={styles.identitySection}>
            <Text style={styles.name}>{profile.prenom} {profile.nom}</Text>
            <Text style={styles.bio}>{profile.bio}</Text>
            <Text style={{color:'#666', marginTop:5}}>{followersCount} Abonnés</Text>
            
            {currentUserId !== profile.uid && (
                <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.followBtn, isFollowing && styles.btnFollowed]} onPress={handleFollow}>
                        <Text style={[styles.followText, isFollowing && {color:'#333'}]}>{isFollowing ? "Abonné" : "S'abonner"}</Text>
                    </TouchableOpacity>

                    {/* NOUVEAU BOUTON MESSAGE */}
                    <TouchableOpacity style={styles.messageBtn} onPress={handleMessage}>
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color="#9333ea" />
                        <Text style={styles.messageBtnText}>Message</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>

        <View style={styles.statsRow}>
            <View style={styles.statCard}><Text style={styles.statNum}>{totalViews}</Text><Text style={styles.statLabel}>Vues</Text></View>
            <View style={styles.statCard}><Text style={styles.statNum}>{totalLikes} ❤️</Text><Text style={styles.statLabel}>J'aime</Text></View>
            <View style={styles.statCard}><Text style={styles.statNum}>{videos.length}</Text><Text style={styles.statLabel}>Vidéos</Text></View>
        </View>

        <View style={styles.gridContainer}>
            {videos.map((video) => (
                <TouchableOpacity key={video.id} style={styles.videoCard} onPress={() => { setSelectedVideo(video); setShowPlayer(true); }}>
                    {video.thumbnail ? <Image source={{ uri: video.thumbnail }} style={styles.videoThumb} resizeMode="cover" /> :
                    <View style={styles.videoThumbPlaceholder}><Ionicons name="videocam" size={24} color="rgba(255,255,255,0.5)" /></View>}
                    <View style={styles.playOverlay}><Ionicons name="play" size={12} color="white" /><Text style={styles.viewsText}>{video.views}</Text></View>
                </TouchableOpacity>
            ))}
        </View>
      </ScrollView>

      <Modal visible={showPlayer && selectedVideo !== null} animationType="slide">
        <View style={styles.fullScreenContainer}>
            {selectedVideo && (
                <>
                    <Video ref={videoRef} source={{ uri: selectedVideo.videoUrl }} style={StyleSheet.absoluteFill} resizeMode={ResizeMode.COVER} shouldPlay isLooping onPlaybackStatusUpdate={(s:any) => {if(s.isLoaded){setProgress(s.positionMillis); setDuration(s.durationMillis || 0);}}} />
                    <View style={styles.rightSide}>
                        <TouchableOpacity style={styles.actionBtn} onPress={handleVideoLike}>
                            <Ionicons name={myLikedVideos.has(selectedVideo.id) ? "heart" : "heart-outline"} size={35} color={myLikedVideos.has(selectedVideo.id) ? "#EF4444" : "white"} />
                            <Text style={styles.actionText}>{selectedVideo.likes}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowComments(true)}>
                            <Ionicons name="chatbubble-ellipses" size={35} color="white" />
                            <Text style={styles.actionText}>{selectedVideo.comments}</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => setShowPlayer(false)} style={styles.closePlayerBtn}><Ionicons name="close" size={30} color="white" /></TouchableOpacity>
                </>
            )}
        </View>
      </Modal>

      {selectedVideo && (
        <CommentModal visible={showComments} videoId={selectedVideo.id} creatorId={selectedVideo.creatorId} videoTitle={selectedVideo.title} onClose={() => setShowComments(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerWrapper: { marginBottom: 60 },
  headerGradient: { height: 140, paddingTop: 50, paddingHorizontal: 20 },
  glassIcon: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 20, width: 40, alignItems:'center' },
  avatarSection: { position: 'absolute', bottom: -40, width: SCREEN_WIDTH, alignItems: 'center' },
  avatarBorder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#9333ea', justifyContent:'center', alignItems:'center', borderWidth:4, borderColor:'white' },
  avatarImg: { width: '100%', height: '100%', borderRadius: 50 },
  avatarCircle: { width: '100%', height: '100%', borderRadius: 50, backgroundColor:'#9333ea', justifyContent:'center', alignItems:'center' },
  avatarInit: { fontSize: 40, color:'white', fontWeight:'bold' },
  identitySection: { alignItems: 'center', marginTop: 10 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  bio: { color: '#666', textAlign: 'center', marginHorizontal: 20 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 15 },
  followBtn: { backgroundColor: '#9333ea', paddingHorizontal: 25, paddingVertical: 10, borderRadius: 20 },
  btnFollowed: { backgroundColor: '#eee' },
  followText: { color: 'white', fontWeight: 'bold' },
  messageBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#9333ea', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, gap: 5 },
  messageBtnText: { color: '#9333ea', fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 20 },
  statCard: { alignItems: 'center' },
  statNum: { fontWeight: 'bold', fontSize: 18, color: '#4B5563' },
  statLabel: { color: '#9CA3AF', fontSize: 12 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  videoCard: { width: ITEM_WIDTH, height: 180, marginRight: GRID_SPACING, marginBottom: GRID_SPACING, backgroundColor: '#1a1a1a' },
  videoThumb: { width: '100%', height: '100%' },
  videoThumbPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  playOverlay: { position: 'absolute', bottom: 5, left: 5, flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewsText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  fullScreenContainer: { flex: 1, backgroundColor: 'black' },
  rightSide: { position: 'absolute', bottom: 100, right: 15, gap: 20 },
  actionBtn: { alignItems: 'center' },
  actionText: { color: 'white', fontSize: 12 },
  closePlayerBtn: { position: 'absolute', top: 50, left: 20 },
});