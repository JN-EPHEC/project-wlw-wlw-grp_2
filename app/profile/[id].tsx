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
  doc, getDoc, collection, query, where, getDocs, updateDoc, 
  arrayUnion, arrayRemove, increment, onSnapshot 
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

  // --- ÉTATS ---
  const [profile, setProfile] = useState<UserData | null>(null);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  
  const [activeTab, setActiveTab] = useState('videos');

  // Player
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<Video>(null);

  const totalViews = videos.reduce((acc, curr) => acc + (curr.views || 0), 0);
  const totalLikes = videos.reduce((acc, curr) => acc + (curr.likes || 0), 0);

  useEffect(() => {
    if (!id) return;
    console.log("--- INIT PROFILE PAGE ---");
    console.log("ID Visité:", id);
    console.log("Mon ID:", currentUserId);

    setLoading(true);

    // 1. ÉCOUTE TEMPS RÉEL DU PROFIL
    const unsubProfile = onSnapshot(doc(db, 'users', id as string), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("🔥 DONNÉES FIREBASE REÇUES:", data); // REGARDEZ ICI DANS LE TERMINAL
            
            // Vérification stricte du tableau followers
            const followersArray = Array.isArray(data.followers) ? data.followers : [];
            console.log("Nombre d'abonnés brut:", followersArray.length);

            const userData: UserData = {
                uid: id as string,
                prenom: data.prenom || 'Utilisateur',
                nom: data.nom || '',
                role: data.role || 'formateur',
                bio: data.bio || 'Membre de SwipeSkills',
                photoURL: data.photoURL || null,
                followers: followersArray,
                following: data.following || [],
                stats: data.stats
            };
            setProfile(userData);
            
            // MISE À JOUR DU COMPTEUR
            setFollowersCount(followersArray.length);
        } else {
            console.log("Document introuvable !");
        }
        setLoading(false);
    }, (error) => {
        console.error("ERREUR SNAPSHOT:", error);
        Alert.alert("Erreur", "Problème de permission Firebase.");
    });

    // 2. VÉRIFICATION SI JE SUIS ABONNÉ
    let unsubMe = () => {};
    if (currentUserId) {
        unsubMe = onSnapshot(doc(db, 'users', currentUserId), (docSnap) => {
            if (docSnap.exists()) {
                const myData = docSnap.data();
                const myFollowing = Array.isArray(myData.following) ? myData.following : [];
                const amIFollowing = myFollowing.includes(id);
                console.log("Est-ce que je le suis ?", amIFollowing);
                setIsFollowing(amIFollowing);
            }
        });
    }

    // 3. CHARGEMENT VIDÉOS
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

    return () => {
        unsubProfile();
        unsubMe();
    };
  }, [id, currentUserId]);


  // --- FONCTION DE DEBUG ABONNEMENT ---
  const handleFollow = async () => {
    if (!currentUserId) return Alert.alert("Erreur", "Non connecté");
    if (!profile) return;

    // 1. OPTIMISTIC UI (On change tout de suite)
    const newStatus = !isFollowing;
    setIsFollowing(newStatus);
    setFollowersCount(prev => newStatus ? prev + 1 : prev - 1);

    console.log("Tentative de mise à jour Firebase...");
    console.log("Action:", newStatus ? "S'abonner" : "Se désabonner");

    try {
      const myRef = doc(db, 'users', currentUserId);
      const targetRef = doc(db, 'users', profile.uid);

      // On utilise Promise.all pour faire les 2 écritures en parallèle
      if (newStatus) {
        // S'abonner
        await Promise.all([
            updateDoc(myRef, { following: arrayUnion(profile.uid) }),
            updateDoc(targetRef, { followers: arrayUnion(currentUserId) })
        ]);
      } else {
        // Se désabonner
        await Promise.all([
            updateDoc(myRef, { following: arrayRemove(profile.uid) }),
            updateDoc(targetRef, { followers: arrayRemove(currentUserId) })
        ]);
      }
      console.log("✅ SUCCÈS FIREBASE !");
    } catch (error: any) { 
        console.error("❌ ERREUR FIREBASE:", error);
        Alert.alert("Erreur Technique", error.message);
        
        // Rollback en cas d'erreur
        setIsFollowing(!newStatus);
        setFollowersCount(prev => newStatus ? prev - 1 : prev + 1);
    }
  };

  // ... (Le reste des fonctions player : openVideo, togglePlayPause, etc. reste identique)
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
                        <Text style={styles.roleText}>
                            {profile.role === 'formateur' ? 'Formateur' : 'Apprenant'}
                        </Text>
                    </View>
                </View>
            </View>
        </View>

        {/* INFOS */}
        <View style={styles.identitySection}>
            <Text style={styles.name}>{profile.prenom} {profile.nom}</Text>
            <Text style={styles.bio}>{profile.bio}</Text>
            
            {/* COMPTEUR */}
            <Text style={{color:'#6B7280', fontSize:12, marginTop:4}}>
                <Text style={{fontWeight:'bold', color:'#333'}}>{followersCount}</Text> Abonnés
            </Text>
            
            {/* BOUTON SUIVRE */}
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

        {/* STATS */}
        <View style={styles.statsRow}>
            <View style={styles.statCard}><Text style={styles.statNum}>{totalViews}</Text><Text style={styles.statLabel}>Vues</Text></View>
            <View style={styles.statCard}><Text style={styles.statNum}>{totalLikes} ❤️</Text><Text style={styles.statLabel}>J'aime</Text></View>
            <View style={styles.statCard}><Text style={styles.statNum}>{videos.length}</Text><Text style={styles.statLabel}>Vidéos</Text></View>
        </View>

        {/* TABS */}
        <View style={styles.tabBar}>
            <TouchableOpacity style={[styles.tab, activeTab === 'videos' && styles.activeTab]}>
                <Text style={[styles.tabLabel, activeTab === 'videos' && styles.activeLabel]}>🎬 Vidéos</Text>
            </TouchableOpacity>
        </View>

        {/* CONTENU */}
        <View style={styles.contentSection}>
            {profile.role === 'formateur' ? (
                <View style={styles.gridContainer}>
                    {videos.length === 0 ? (
                        <View style={styles.emptyCard}><Text style={styles.emptyText}>Aucune vidéo publiée.</Text></View>
                    ) : (
                        videos.map((video) => (
                            <TouchableOpacity key={video.id} style={[styles.videoCard, video.isPinned && styles.videoCardPinned]} onPress={() => openVideo(video)}>
                                <View style={styles.videoThumb}>
                                    {video.thumbnail ? (
                                        <Image source={{ uri: video.thumbnail }} style={styles.thumbImage} resizeMode="cover" />
                                    ) : (
                                        <View style={[styles.center, {backgroundColor:'#333'}]}><Ionicons name="play-circle" size={30} color="white" /></View>
                                    )}
                                    {video.isPinned && <View style={styles.pinBadge}><Ionicons name="pricetag" size={10} color="white" /></View>}
                                    <View style={styles.overlayBottomRight}>
                                        <Ionicons name="play" size={10} color="white" />
                                        <Text style={styles.overlayTextSm}>{video.views}</Text>
                                    </View>
                                </View>
                                <View style={styles.videoInfoBlock}>
                                    <Text numberOfLines={1} style={styles.videoTitle}>{video.title}</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            ) : (
                <View style={styles.emptyCard}><Text style={styles.emptyText}>Profil Apprenant</Text></View>
            )}
        </View>
        <View style={{height: 50}} />
      </ScrollView>

      {/* PLAYER MODAL */}
      <Modal visible={showPlayer && selectedVideo !== null} animationType="slide" transparent={false} onRequestClose={() => setShowPlayer(false)}>
        <View style={styles.fullScreenPlayerContainer}>
            <StatusBar hidden />
            {selectedVideo && (
                <>
                    <TouchableOpacity activeOpacity={1} onPress={togglePlayPause} style={styles.videoWrapper}>
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
                        {!isPlaying && (
                            <View style={styles.playPauseIcon}><Ionicons name="play" size={80} color="rgba(255,255,255,0.8)" /></View>
                        )}
                    </TouchableOpacity>

                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.playerGradient}>
                        <View style={styles.progressBarContainer}>
                            <View style={styles.progressBarBackground}>
                                <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
                            </View>
                        </View>

                        <View style={styles.playerInfoRow}>
                            <View style={{flex: 1, marginRight: 20}}>
                                <View style={styles.creatorRow}>
                                    <View style={styles.miniAvatar}><Text style={styles.miniAvatarText}>{profile?.prenom[0]}</Text></View>
                                    <Text style={styles.creatorName}>@{profile?.prenom} {profile?.nom}</Text>
                                </View>
                                <Text style={styles.playerTitle}>{selectedVideo.title}</Text>
                                <Text style={styles.playerDesc} numberOfLines={2}>{selectedVideo.description}</Text>
                            </View>

                            <View style={styles.playerActions}>
                                <View style={styles.actionBtn}><Ionicons name="heart" size={32} color="white" /><Text style={styles.actionText}>{selectedVideo.likes}</Text></View>
                                <View style={styles.actionBtn}><Ionicons name="chatbubble-ellipses" size={32} color="white" /><Text style={styles.actionText}>{selectedVideo.comments || 0}</Text></View>
                                <View style={styles.actionBtn}><Ionicons name="share-social" size={32} color="white" /><Text style={styles.actionText}>Partager</Text></View>
                            </View>
                        </View>
                    </LinearGradient>

                    <TouchableOpacity onPress={() => setShowPlayer(false)} style={styles.closePlayerBtn}>
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                </>
            )}
        </View>
      </Modal>
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
  tabBar: { flexDirection: 'row', marginHorizontal: 20, marginTop: 25, backgroundColor: '#F9FAFB', padding: 4, borderRadius: 16 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12 },
  activeTab: { backgroundColor: '#FFF', elevation: 2 },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  activeLabel: { color: '#111827' },
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
  fullScreenPlayerContainer: { flex: 1, backgroundColor: 'black' },
  videoWrapper: { flex: 1 },
  playPauseIcon: { position: 'absolute', top: '50%', left: '50%', marginTop: -40, marginLeft: -40, zIndex: 10 },
  playerGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', zIndex: 10, paddingHorizontal: 20, paddingBottom: 40, justifyContent: 'flex-end' },
  progressBarContainer: { marginBottom: 20, width: '100%' },
  progressBarBackground: { height: 2, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#9333ea', borderRadius: 1 },
  playerInfoRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  creatorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  miniAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#9333ea', justifyContent:'center', alignItems:'center', marginRight: 10, borderWidth: 1, borderColor:'#fff' },
  miniAvatarText: { color:'white', fontWeight:'bold' },
  creatorName: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  playerTitle: { color: 'white', fontSize: 16, marginBottom: 5, fontWeight: '600' },
  playerDesc: { color: '#ddd', fontSize: 13 },
  playerActions: { alignItems: 'center', gap: 20 },
  actionBtn: { alignItems: 'center' },
  actionText: { color: 'white', fontSize: 12, marginTop: 5, fontWeight: '600' },
  closePlayerBtn: { position: 'absolute', top: 50, left: 20, padding: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, zIndex: 999 },
});