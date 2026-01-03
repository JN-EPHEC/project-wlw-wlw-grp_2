import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Dimensions, TextInput, ActivityIndicator, Alert, Modal, RefreshControl, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

// ===== IMPORTS FIREBASE =====
import { auth, db, storage } from '../../firebaseConfig'; 
import { 
  doc, getDoc, updateDoc, collection, addDoc, query, where, orderBy, getDocs, serverTimestamp, deleteDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut as firebaseSignOut } from 'firebase/auth';

const { width, height } = Dimensions.get('window');

// --- TYPES ---
interface CreatorVideo {
  id: string;
  videoUrl: string;
  thumbnail?: string;
  title: string;
  description?: string;
  views: number;
  likes: number;
  comments: number; // Ajouté
  isPinned?: boolean;
  createdAt: any;
  category?: string; // Ajouté
  tags?: string[]; // Ajouté
}

interface Playlist {
  id: string;
  name: string;
  videoIds: string[];
}

export default function ProfileFormateurScreen() {
  const router = useRouter();
  
  // --- ÉTATS ---
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('videos');
  
  // Édition Profil
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Données
  const [myVideos, setMyVideos] = useState<CreatorVideo[]>([]);
  const [myPlaylists, setMyPlaylists] = useState<Playlist[]>([]);
  
  // Modals & Actions
  const [showSettings, setShowSettings] = useState(false);
  const [showVideoOptions, setShowVideoOptions] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false); 
  const [selectedVideo, setSelectedVideo] = useState<CreatorVideo | null>(null);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // Player State
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Stats calculées
  const totalViews = myVideos.reduce((acc, curr) => acc + (curr.views || 0), 0);
  const totalLikes = myVideos.reduce((acc, curr) => acc + (curr.likes || 0), 0);

  // --- CHARGEMENT ---
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) { router.replace('/login'); return; }

      // 1. Profil Utilisateur
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile(data);
        setEditedName(`${data.prenom || ''} ${data.nom || ''}`.trim());
        setEditedBio(data.bio || "Formateur expert 🎓");
      }

      // 2. Mes Vidéos
      try {
          const vRef = collection(db, 'videos');
          const vQuery = query(vRef, where('creatorId', '==', user.uid));
          const vSnapshot = await getDocs(vQuery);
          
          const videosData = vSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as CreatorVideo));
          
          videosData.sort((a, b) => {
             if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
             const dateA = a.createdAt?.seconds || 0;
             const dateB = b.createdAt?.seconds || 0;
             return dateB - dateA;
          });

          setMyVideos(videosData);
      } catch (e) { console.error("Erreur chargement vidéos:", e); }

      // 3. Mes Playlists
      try {
          const pRef = collection(db, 'playlists');
          const pQuery = query(pRef, where('userId', '==', user.uid));
          const pSnapshot = await getDocs(pQuery);
          const playlistsData = pSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Playlist));
          setMyPlaylists(playlistsData);
      } catch (e) { console.log("Erreur playlists:", e); }

    } catch (error) { console.error("Erreur générale:", error); } 
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ===== DÉCONNEXION =====
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      router.replace('/login');
    } catch (error) { Alert.alert('Erreur', 'Impossible de se déconnecter'); }
  };

  // --- ACTIONS PROFIL ---
  const saveProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const [prenom, ...nomArray] = editedName.split(' ');
    await updateDoc(doc(db, 'users', user.uid), {
      prenom: prenom || '', nom: nomArray.join(' ') || '', bio: editedBio
    });
    setIsEditing(false);
    loadProfile();
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.5,
    });
    if (!result.canceled) uploadImage(result.assets[0].uri);
  };

  const uploadImage = async (uri: string) => {
    const user = auth.currentUser;
    if (!user) return;
    setIsUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(fileRef, blob);
      const downloadURL = await getDownloadURL(fileRef);
      await updateDoc(doc(db, 'users', user.uid), { photoURL: downloadURL });
      setUserProfile((prev: any) => ({ ...prev, photoURL: downloadURL }));
    } catch (e) { Alert.alert("Erreur", "Upload échoué"); } 
    finally { setIsUploading(false); }
  };

  // --- ACTIONS VIDÉOS (Player & Options) ---

  const openVideoPlayer = (video: CreatorVideo) => {
    setSelectedVideo(video);
    setShowPlayer(true);
    setIsPlaying(true);
  };

  const openVideoOptions = () => {
    setShowVideoOptions(true);
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setProgress(status.positionMillis);
      setDuration(status.durationMillis || 0);
    }
  };

  const togglePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await videoRef.current.playAsync();
        setIsPlaying(true);
      }
    }
  };

  const togglePinVideo = async () => {
    if (!selectedVideo) return;
    try {
        const newStatus = !selectedVideo.isPinned;
        await updateDoc(doc(db, 'videos', selectedVideo.id), { isPinned: newStatus });
        Alert.alert("Succès", newStatus ? "Vidéo épinglée 📌" : "Vidéo désépinglée");
        setShowVideoOptions(false);
        loadProfile(); 
        setSelectedVideo(prev => prev ? {...prev, isPinned: newStatus} : null);
    } catch (e) { Alert.alert("Erreur", "Action impossible"); }
  };

  const deleteVideo = async () => {
    if (!selectedVideo) return;
    Alert.alert("Supprimer", "Voulez-vous vraiment supprimer cette vidéo ?", [
        { text: "Annuler", style: 'cancel' },
        { text: "Supprimer", style: 'destructive', onPress: async () => {
            try {
                await deleteDoc(doc(db, 'videos', selectedVideo.id));
                setShowVideoOptions(false);
                setShowPlayer(false);
                loadProfile();
            } catch(e) { Alert.alert("Erreur", "Suppression impossible"); }
        }}
    ]);
  };

  // --- ACTIONS PLAYLISTS ---
  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
        const user = auth.currentUser;
        if (!user) return;
        await addDoc(collection(db, 'playlists'), {
            name: newPlaylistName, userId: user.uid, videoIds: [], createdAt: serverTimestamp()
        });
        setNewPlaylistName('');
        setShowCreatePlaylist(false);
        loadProfile();
    } catch (e) { Alert.alert("Erreur", "Création impossible"); }
  };

  if (loading || !userProfile) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#9333ea" /></View>;
  }

  const progressPercentage = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <View style={{flex: 1, backgroundColor: '#FFFFFF'}}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); loadProfile();}} />}
      >
        {/* HEADER */}
        <View style={styles.headerWrapper}>
            <LinearGradient colors={['#9333ea', '#7e22ce']} style={styles.headerGradient}>
                <View style={styles.topIcons}>
                    <TouchableOpacity style={styles.glassIcon} onPress={() => setShowSettings(true)}>
                        <Ionicons name="settings-outline" size={20} color="white" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.glassIcon, { backgroundColor: 'rgba(239, 68, 68, 0.4)' }]} 
                        onPress={signOut}
                    >
                        <Ionicons name="log-out-outline" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <View style={styles.avatarSection}>
                <View style={styles.avatarContainer}>
                    <TouchableOpacity onPress={pickImage} style={styles.avatarBorder} disabled={isUploading}>
                        {isUploading ? <ActivityIndicator color="white" /> : userProfile.photoURL ? (
                            <Image source={{ uri: userProfile.photoURL }} style={styles.avatarImg} />
                        ) : (
                            <View style={styles.avatarCircle}><Text style={styles.avatarInit}>{userProfile.prenom?.[0] || 'F'}</Text></View>
                        )}
                    </TouchableOpacity>
                    <View style={styles.roleBadge}>
                        <Ionicons name="school" size={10} color="#9333ea" />
                        <Text style={styles.roleText}>Formateur</Text>
                    </View>
                </View>
            </View>
        </View>

        {/* IDENTITÉ */}
        <View style={styles.identitySection}>
            {isEditing ? (
                <View style={styles.editForm}>
                    <TextInput style={styles.input} value={editedName} onChangeText={setEditedName} placeholder="Nom Complet" />
                    <TextInput style={[styles.input, { height: 60 }]} value={editedBio} onChangeText={setEditedBio} multiline placeholder="Biographie" />
                    <View style={styles.editButtons}>
                        <TouchableOpacity style={[styles.saveBtn, styles.cancelBtn]} onPress={() => setIsEditing(false)}>
                            <Text style={styles.cancelBtnText}>Annuler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
                            <Text style={styles.saveBtnText}>Enregistrer</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <>
                    <Text style={styles.name}>{userProfile.prenom} {userProfile.nom}</Text>
                    <Text style={styles.bio}>{userProfile.bio}</Text>
                    <Text style={{color:'#6B7280', fontSize:12, marginTop:4}}>
                        <Text style={{fontWeight:'bold', color:'#333'}}>{userProfile.followersCount || 0}</Text> Abonnés
                    </Text>

                    <TouchableOpacity style={styles.modifyBtn} onPress={() => setIsEditing(true)}>
                        <Ionicons name="create-outline" size={16} color="#9333ea" />
                        <Text style={styles.modifyText}>Modifier mon espace</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
            <View style={styles.statCard}>
                <Text style={styles.statNum}>{totalViews}</Text>
                <Text style={styles.statLabel}>Vues totales</Text>
            </View>
            <View style={styles.statCard}>
                <Text style={styles.statNum}>{totalLikes} ❤️</Text>
                <Text style={styles.statLabel}>J'aime cumulés</Text>
            </View>
            <View style={styles.statCard}>
                <Text style={styles.statNum}>{myVideos.length}</Text>
                <Text style={styles.statLabel}>Vidéos publiées</Text>
            </View>
        </View>

        {/* TABS */}
        <View style={styles.tabBar}>
            {['videos', 'playlists'].map((tab) => (
                <TouchableOpacity 
                    key={tab} 
                    style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
                    onPress={() => setActiveTab(tab)}
                >
                    <Ionicons 
                        name={tab === 'videos' ? 'videocam' : 'list'} 
                        size={20} 
                        color={activeTab === tab ? '#9333ea' : '#71717A'} 
                    />
                    <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                        {tab === 'videos' ? 'Mes Vidéos' : 'Playlists'}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>

        {/* CONTENU PRINCIPAL */}
        <View style={styles.contentContainer}>
            
            {/* LISTE DES VIDÉOS */}
            {activeTab === 'videos' && (
                <View style={styles.gridContainer}>
                    {myVideos.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={{color:'#777', marginBottom:10}}>Aucune vidéo publiée.</Text>
                            <TouchableOpacity style={styles.uploadBtn} onPress={() => router.push('/(tabs-formateur)/upload' as any)}>
                                <Text style={{color:'white', fontWeight:'bold'}}>Publier maintenant</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        myVideos.map((video) => (
                            <TouchableOpacity 
                                key={video.id} 
                                style={[styles.videoCard, video.isPinned && styles.videoCardPinned]}
                                onPress={() => openVideoPlayer(video)}
                            >
                                <View style={styles.videoThumb}>
                                    {video.thumbnail ? (
                                        <Image source={{ uri: video.thumbnail }} style={styles.thumbImage} resizeMode="cover" />
                                    ) : (
                                        <View style={[styles.center, {backgroundColor:'#333'}]}>
                                            <Ionicons name="play-circle" size={30} color="white" />
                                        </View>
                                    )}
                                    
                                    {video.isPinned && (
                                        <View style={styles.pinBadge}>
                                            <Ionicons name="pricetag" size={12} color="white" />
                                        </View>
                                    )}

                                    <View style={styles.overlayCenter}>
                                        <Ionicons name="eye" size={16} color="white" />
                                        <Text style={styles.overlayText}>{video.views || 0}</Text>
                                    </View>

                                    <View style={styles.overlayBottomRight}>
                                        <Ionicons name="heart" size={14} color="white" />
                                        <Text style={styles.overlayTextSm}>{video.likes || 0}</Text>
                                    </View>
                                </View>
                                
                                <View style={styles.videoInfoBlock}>
                                    <Text style={styles.videoTitle} numberOfLines={1}>{video.title}</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            )}

            {/* LISTE PLAYLISTS */}
            {activeTab === 'playlists' && (
                <View>
                    <TouchableOpacity style={styles.createPlaylistBtn} onPress={() => setShowCreatePlaylist(true)}>
                        <View style={styles.createPlaylistIcon}><Ionicons name="add" size={24} color="#9333ea" /></View>
                        <Text style={styles.createPlaylistText}>Nouvelle Playlist</Text>
                    </TouchableOpacity>

                    {myPlaylists.map(pl => (
                        <TouchableOpacity key={pl.id} style={styles.playlistCard}>
                            <View style={styles.playlistIcon}><Ionicons name="musical-notes" size={24} color="#9333ea" /></View>
                            <View style={{flex:1}}>
                                <Text style={styles.playlistTitle}>{pl.name}</Text>
                                <Text style={styles.playlistCount}>{pl.videoIds?.length || 0} vidéos</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </TouchableOpacity>
                    ))}
                </View>
            )}

        </View>
        <View style={{height: 100}} />
      </ScrollView>

      {/* ================= MODALS ================= */}

      {/* 1. LECTEUR VIDÉO IMMERSIF (STYLE HOME) */}
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
                            useNativeControls={false} // On gère nous même l'overlay pour le style "Home"
                            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                        />
                        {!isPlaying && (
                            <View style={styles.playPauseIcon}>
                                <Ionicons name="play" size={80} color="rgba(255,255,255,0.8)" />
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* DÉGRADÉ NOIR EN BAS */}
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gradientOverlay} />

                    {/* BARRE DE PROGRESSION */}
                    <View style={styles.progressBarContainer}>
                        <View style={styles.progressBarBackground}>
                            <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
                        </View>
                    </View>

                    {/* INFOS GAUCHE (Avatar, Nom, Desc) */}
                    <View style={styles.leftSide}>
                        <View style={styles.creatorInfo}>
                            <View style={styles.creatorAvatar}>
                                <Text style={styles.creatorInitial}>{userProfile?.prenom?.[0] || 'F'}</Text>
                            </View>
                            <Text style={styles.creatorName}>@{userProfile?.prenom} {userProfile?.nom}</Text>
                        </View>
                        
                        <Text style={styles.videoTitleFull}>{selectedVideo.title}</Text>
                        <Text style={styles.videoDescFull} numberOfLines={2}>{selectedVideo.description}</Text>
                        
                        <View style={styles.tagsContainer}>
                            {selectedVideo.tags?.slice(0, 3).map((tag, idx) => (
                                <Text key={idx} style={styles.tag}>#{tag}</Text>
                            ))}
                        </View>
                    </View>

                    {/* BOUTONS DROITE (Actions) */}
                    <View style={styles.rightSide}>
                        {/* 3 POINTS (MENU) - SPÉCIFIQUE FORMATEUR */}
                        <TouchableOpacity style={[styles.actionButton, {marginBottom: 20}]} onPress={openVideoOptions}>
                            <View style={[styles.actionIcon, {backgroundColor:'rgba(0,0,0,0.6)'}]}>
                                <Ionicons name="ellipsis-horizontal" size={24} color="white" />
                            </View>
                        </TouchableOpacity>

                        {/* Likes */}
                        <View style={styles.actionButton}>
                            <View style={styles.actionIcon}>
                                <Ionicons name="heart" size={30} color="white" />
                            </View>
                            <Text style={styles.actionCount}>{selectedVideo.likes || 0}</Text>
                        </View>

                        {/* Commentaires */}
                        <View style={styles.actionButton}>
                            <View style={styles.actionIcon}>
                                <Ionicons name="chatbubble-ellipses" size={30} color="white" />
                            </View>
                            <Text style={styles.actionCount}>{selectedVideo.comments || 0}</Text>
                        </View>

                        {/* Partager */}
                        <View style={styles.actionButton}>
                            <View style={styles.actionIcon}>
                                <Ionicons name="share-social" size={30} color="white" />
                            </View>
                            <Text style={styles.actionCount}>Partager</Text>
                        </View>
                    </View>

                    {/* BOUTON FERMER (Haut Gauche) */}
                    <TouchableOpacity onPress={() => setShowPlayer(false)} style={styles.closePlayerBtn}>
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                </>
            )}
        </View>
      </Modal>

      {/* 2. MENU OPTIONS (3 Points) */}
      <Modal visible={showVideoOptions} transparent animationType="fade" onRequestClose={() => setShowVideoOptions(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Options de la vidéo</Text>
                
                <TouchableOpacity style={styles.modalOption} onPress={togglePinVideo}>
                    <Ionicons name={selectedVideo?.isPinned ? "pricetag-outline" : "pricetag"} size={24} color="#9333ea" />
                    <Text style={styles.modalOptionText}>
                        {selectedVideo?.isPinned ? "Désépingler du profil" : "Épingler en haut"}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalOption} onPress={() => Alert.alert("Modifier", "Fonctionnalité à venir")}>
                    <Ionicons name="create-outline" size={24} color="#333" />
                    <Text style={styles.modalOptionText}>Modifier les informations</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalOption, {borderBottomWidth:0}]} onPress={deleteVideo}>
                    <Ionicons name="trash-outline" size={24} color="#EF4444" />
                    <Text style={[styles.modalOptionText, {color:'#EF4444'}]}>Supprimer définitivement</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalCancel} onPress={() => setShowVideoOptions(false)}>
                    <Text style={{color:'#777'}}>Annuler</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* 3. PARAMÈTRES */}
      <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSettings(false)}>
        <View style={styles.settingsContainer}>
            <View style={styles.settingsHeader}>
                <TouchableOpacity onPress={() => setShowSettings(false)}>
                    <Ionicons name="chevron-back" size={28} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.settingsTitle}>Paramètres</Text>
                <View style={{width: 28}} /> 
            </View>
            <ScrollView contentContainerStyle={{padding: 20}}>
                {/* Contenu Paramètres Identique Apprenant */}
                <Text style={styles.settingsSectionTitle}>COMPTE</Text>
                <View style={styles.settingsGroup}>
                    <TouchableOpacity style={styles.settingsRow}>
                        <View style={styles.settingsIconBg}><Ionicons name="person-outline" size={20} color="#9333ea" /></View>
                        <View style={{flex:1, marginLeft: 12}}>
                            <Text style={styles.settingsRowTitle}>Profil</Text>
                            <Text style={styles.settingsRowSubtitle}>{userProfile?.prenom}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                    </TouchableOpacity>
                </View>
                {/* ... Autres options ... */}
                <Text style={styles.settingsSectionTitle}>ACTIONS</Text>
                <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                    <Ionicons name="log-out-outline" size={20} color="#374151" style={{marginRight: 8}} />
                    <Text style={styles.logoutText}>Se déconnecter</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
      </Modal>

      {/* 4. CRÉER PLAYLIST */}
      <Modal visible={showCreatePlaylist} transparent animationType="fade" onRequestClose={() => setShowCreatePlaylist(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Nouvelle Playlist</Text>
                <TextInput style={styles.modalInput} placeholder="Nom..." value={newPlaylistName} onChangeText={setNewPlaylistName} />
                <View style={styles.modalActions}>
                    <TouchableOpacity onPress={() => setShowCreatePlaylist(false)}><Text style={{color:'#777'}}>Annuler</Text></TouchableOpacity>
                    <TouchableOpacity onPress={createPlaylist}><Text style={{color:'#9333ea', fontWeight:'bold'}}>Créer</Text></TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  headerWrapper: { marginBottom: 50 },
  headerGradient: { height: 140, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingTop: 50, paddingHorizontal: 20 },
  topIcons: { flexDirection: 'row', justifyContent: 'flex-end' },
  glassIcon: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 20, marginLeft: 10 },

  // Avatar
  avatarSection: { position: 'absolute', bottom: -40, left: 0, right: 0, alignItems: 'center' },
  avatarContainer: { position: 'relative' },
  avatarBorder: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#FFF', backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  avatarImg: { width: '100%', height: '100%', borderRadius: 50 },
  avatarCircle: { width: '100%', height: '100%', borderRadius: 50, backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center' },
  avatarInit: { fontSize: 40, color: '#FFF', fontWeight: 'bold' },
  roleBadge: { position: 'absolute', bottom: -5, alignSelf: 'center', backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor:'#000', shadowOpacity:0.1, shadowOffset:{width:0, height:2} },
  roleText: { fontSize: 10, fontWeight: 'bold', color: '#9333ea', marginLeft: 4 },

  // Identité
  identitySection: { alignItems: 'center', marginTop: 10, paddingHorizontal: 20 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  bio: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4 },
  modifyBtn: { marginTop: 12, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 24, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  modifyText: { fontSize: 13, color: '#9333ea', fontWeight: '600', marginLeft: 6 },
  
  // Edit Mode
  editForm: { width: '100%', gap: 10 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12 },
  editButtons: { flexDirection: 'row', gap: 10 },
  saveBtn: { flex: 1, backgroundColor: '#9333ea', padding: 12, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#F3F4F6' },
  saveBtnText: { color: '#FFF', fontWeight: '600' },
  cancelBtnText: { color: '#374151', fontWeight: '600' },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 20 },
  statCard: { width: '31%', backgroundColor: '#FFF', padding: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6', elevation: 1, shadowColor:'#000', shadowOpacity:0.05, shadowOffset:{width:0, height:1} },
  statNum: { fontSize: 18, fontWeight: 'bold', color: '#4B5563' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  // Tabs
  tabBar: { flexDirection: 'row', marginHorizontal: 20, marginTop: 25, backgroundColor: '#F9FAFB', padding: 4, borderRadius: 16 },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12 },
  tabItemActive: { backgroundColor: '#FFF', elevation: 2, shadowColor:'#000', shadowOpacity:0.05 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginLeft: 4 },
  tabTextActive: { color: '#111827' },

  contentContainer: { padding: 20 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  
  // Video Card
  videoCard: { width: '48%', marginBottom: 15 },
  videoCardPinned: { borderColor: '#9333ea', borderWidth: 2, borderRadius: 14 },
  videoThumb: { width: '100%', height: 120, backgroundColor: '#333', borderRadius: 12, overflow: 'hidden', position: 'relative' },
  thumbImage: { width: '100%', height: '100%' },
  
  // Overlays (Miniatures)
  overlayCenter: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  overlayText: { color: 'white', fontWeight: 'bold', marginLeft: 4 },
  overlayBottomRight: { position: 'absolute', bottom: 5, right: 5, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  overlayTextSm: { color: 'white', fontSize: 10, marginLeft: 3 },
  pinBadge: { position: 'absolute', top: 5, left: 5, backgroundColor: '#9333ea', padding: 4, borderRadius: 4 },

  videoInfoBlock: { padding: 5 },
  videoTitle: { fontSize: 12, fontWeight: '600', color: '#374151' },

  // ================= STYLES PLAYER PLEIN ÉCRAN =================
  fullScreenPlayerContainer: { flex: 1, backgroundColor: 'black' },
  videoWrapper: { flex: 1 },
  playPauseIcon: { position: 'absolute', top: '50%', left: '50%', marginTop: -40, marginLeft: -40, zIndex: 10 },
  gradientOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', zIndex: 10, pointerEvents: 'none' },
  
  // Bar de progression
  progressBarContainer: { position: 'absolute', bottom: 80, left: 0, right: 0, paddingHorizontal: 16, zIndex: 40 },
  progressBarBackground: { height: 2, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#7459F0', borderRadius: 1 },

  // Infos Gauche
  leftSide: { position: 'absolute', bottom: 100, left: 16, right: 80, zIndex: 30 },
  creatorInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  creatorAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#7459F0', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  creatorInitial: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  creatorName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  videoTitleFull: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  videoDescFull: { color: '#fff', fontSize: 14, marginBottom: 8, lineHeight: 20 },
  tagsContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: { color: '#7459F0', fontSize: 14, fontWeight: '600' },

  // Actions Droite
  rightSide: { position: 'absolute', bottom: 100, right: 8, gap: 20, alignItems: 'center', zIndex: 50 },
  actionButton: { alignItems: 'center', gap: 4 },
  actionIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  actionCount: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Boutons Overlay Player
  closePlayerBtn: { position: 'absolute', top: 50, left: 20, padding: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, zIndex: 999 },

  // Playlists
  createPlaylistBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  createPlaylistIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  createPlaylistText: { fontWeight: '600', color: '#1F2937' },
  playlistCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  playlistIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  playlistTitle: { fontWeight: 'bold', color: '#1F2937' },
  playlistCount: { fontSize: 12, color: '#9CA3AF' },

  // Empty State
  emptyState: { padding: 40, alignItems: 'center', width: '100%' },
  uploadBtn: { marginTop: 10, backgroundColor: '#9333ea', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', padding: 20, borderRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalOptionText: { fontSize: 16, marginLeft: 15, color: '#333' },
  modalCancel: { marginTop: 15, alignItems: 'center' },
  modalInput: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },

  // Settings
  settingsContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, backgroundColor: '#FFF' },
  settingsTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  settingsSectionTitle: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginTop: 20, marginBottom: 8, marginLeft: 4 },
  settingsGroup: { backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  settingsIconBg: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center' },
  settingsRowTitle: { fontSize: 15, fontWeight: '500', color: '#1F2937' },
  settingsRowSubtitle: { fontSize: 13, color: '#6B7280' },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 56 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', marginTop: 20, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  logoutText: { fontWeight: '600', color: '#374151', fontSize: 15 },
  deleteAccountBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', marginTop: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FECACA' },
  deleteAccountText: { fontWeight: '600', color: '#EF4444', fontSize: 15 },
  versionText: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 30, marginBottom: 20 },
});