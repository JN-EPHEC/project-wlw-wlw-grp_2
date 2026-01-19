import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Dimensions, ActivityIndicator, Alert, Modal, StatusBar, TextInput, Platform, Linking, Clipboard
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { 
  doc, collection, query, where, updateDoc, 
  arrayUnion, arrayRemove, increment, onSnapshot, getDoc, deleteDoc, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';

import CommentModal from '../../components/CommentModal';
import { sendNotification } from '../../app/utils/notificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const GRID_SPACING = 2;
const ITEM_WIDTH = (SCREEN_WIDTH - (GRID_SPACING * (COLUMN_COUNT + 1))) / COLUMN_COUNT;

const INTEREST_CONFIG: Record<string, { icon: string, color: string, label: string }> = {
  'digital-marketing': { icon: '📱', color: '#E0F2FE', label: 'Marketing' },
  'ia': { icon: '🤖', color: '#F3E8FF', label: 'IA' },
  'ecommerce': { icon: '🛒', color: '#FEF3C7', label: 'E-commerce' },
  'design': { icon: '🎨', color: '#FCE7F3', label: 'Design' },
  'dev': { icon: '💻', color: '#DCFCE7', label: 'Dev' },
  'business': { icon: '📊', color: '#FFEDD5', label: 'Business' },
};

interface UserData { 
  uid: string; 
  prenom: string; 
  nom: string; 
  displayName?: string;
  role: 'formateur' | 'apprenant'; 
  badge?: 'apprenant' | 'expert' | 'pro';
  bio?: string; 
  photoURL?: string; 
  followers?: string[]; 
  following?: string[]; 
  stats?: { videosWatched: number; }; 
  interests?: string[];
  createdAt?: any;
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
  category?: string;
  isPinned?: boolean; 
  createdAt?: any; 
}

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid;

  const [profile, setProfile] = useState<UserData | null>(null);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<VideoData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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
  const videoRef = useRef<Video>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  const [showShareModal, setShowShareModal] = useState(false);

  const totalViews = videos.reduce((acc, curr) => acc + (curr.views || 0), 0);
  const totalLikes = videos.reduce((acc, curr) => acc + (curr.likes || 0), 0);

  const canInteract = true;

  const categories: string[] = ['all', ...Array.from(new Set(videos.map(v => v.category).filter((c): c is string => Boolean(c))))];
  
  const formatMemberSince = (createdAt: any): string => {
    if (!createdAt) return '';
    
    try {
      let date: Date;
      
      if (typeof createdAt.toDate === 'function') {
        date = createdAt.toDate();
      } else if (createdAt instanceof Date) {
        date = createdAt;
      } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
        date = new Date(createdAt);
      } else if (createdAt.seconds) {
        date = new Date(createdAt.seconds * 1000);
      } else {
        return '';
      }
      
      return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    } catch (error) {
      console.error('Erreur formatage date:', error);
      return '';
    }
  };

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
            setProfile({ 
              uid: id as string, 
              displayName: data.displayName || `${data.prenom} ${data.nom}`.trim(),
              ...data 
            } as UserData);
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

    const vQuery = query(
        collection(db, 'videos'), 
        where('creatorId', '==', id)
    );

    const unsubVideos = onSnapshot(vQuery, (snapshot) => {
        const videosData = snapshot.docs.map(d => ({ 
            id: d.id, 
            ...d.data() 
        } as VideoData));
        
        videosData.sort((a, b) => {
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return bTime - aTime;
        });
        
        setVideos(videosData);
        setFilteredVideos(videosData);
        
        // ✅ MISE À JOUR DU COMPTEUR EN TEMPS RÉEL si video ouverte
        if (selectedVideo) {
          const updated = videosData.find(v => v.id === selectedVideo.id);
          if (updated) {
            setSelectedVideo(updated);
          }
        }
    }, (error) => {
        console.error('Erreur chargement vidéos:', error);
    });

    return () => {
        unsubProfile();
        unsubVideos();
    };
  }, [id, currentUserId]);

  useEffect(() => {
    if (!selectedCategory || selectedCategory === 'all') {
      setFilteredVideos(videos);
    } else {
      setFilteredVideos(videos.filter(v => v.category === selectedCategory));
    }
  }, [selectedCategory, videos]);

  const handleUpdateVideo = async () => {
    if (!selectedVideo || !editTitle.trim()) return;
    
    setIsSaving(true);
    try {
      const videoDocRef = doc(db, 'videos', selectedVideo.id);
      await updateDoc(videoDocRef, {
        title: editTitle.trim(),
        description: editDescription.trim()
      });
      
      setVideos(prev => prev.map(v => 
        v.id === selectedVideo.id 
        ? { ...v, title: editTitle, description: editDescription } 
        : v
      ));
      setSelectedVideo(prev => prev ? { ...prev, title: editTitle, description: editDescription } : null);
      
      Alert.alert("✓", "Vidéo mise à jour !");
      setIsEditing(false);
    } catch (error) {
      Alert.alert("Erreur", "Impossible de modifier la vidéo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMessage = () => {
    if (!profile || !canInteract) return;
    router.push({
      pathname: "/chat" as any, 
      params: { conversationId: profile.uid } 
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
        Alert.alert('✓', `Vous ne suivez plus ${profile.displayName || profile.prenom}`);
      } else {
        await updateDoc(myRef, { following: arrayUnion(profile.uid) });
        await updateDoc(targetRef, { followers: arrayUnion(currentUserId) });
        
        // ✅ FIX: Envoi notification sans videoThumb
        await addDoc(collection(db, 'notifications'), {
          userId: profile.uid,
          fromUserId: currentUserId,
          fromUserName: currentUserName,
          type: 'follow',
          read: false,
          createdAt: serverTimestamp()
        });
        
        Alert.alert('✓', `Vous suivez maintenant ${profile.displayName || profile.prenom}`);
      }
    } catch (error: any) {
      console.error('Erreur follow:', error);
      Alert.alert("Erreur", error.message || "Impossible de modifier l'abonnement");
    }
  };

  const handleVideoLike = async () => {
    if (!currentUserId || !selectedVideo || !canInteract) return;
    const isLiked = myLikedVideos.has(selectedVideo.id);
    
    setMyLikedVideos(prev => { 
      const s = new Set(prev); 
      if (isLiked) {
        s.delete(selectedVideo.id);
      } else {
        s.add(selectedVideo.id);
      }
      return s; 
    });
    
    setSelectedVideo(prev => prev ? {
      ...prev,
      likes: isLiked ? prev.likes - 1 : prev.likes + 1
    } : null);
    
    setVideos(prevVideos => prevVideos.map(v => 
      v.id === selectedVideo.id 
        ? { ...v, likes: isLiked ? v.likes - 1 : v.likes + 1 }
        : v
    ));
    
    try {
        const vRef = doc(db, 'videos', selectedVideo.id);
        const uRef = doc(db, 'users', currentUserId);
        
        if (isLiked) {
            await updateDoc(uRef, { likedVideos: arrayRemove(selectedVideo.id) });
            await updateDoc(vRef, { likes: increment(-1) });
        } else {
            await updateDoc(uRef, { likedVideos: arrayUnion(selectedVideo.id) });
            await updateDoc(vRef, { likes: increment(1) });
            
            // ✅ FIX: Notification avec données obligatoires seulement
            await addDoc(collection(db, 'notifications'), {
              userId: selectedVideo.creatorId,
              fromUserId: currentUserId,
              fromUserName: currentUserName,
              type: 'like',
              videoId: selectedVideo.id,
              videoTitle: selectedVideo.title,
              read: false,
              createdAt: serverTimestamp()
            });
        }
    } catch (e) { 
        console.error('Erreur like:', e);
        
        setMyLikedVideos(prev => { 
          const s = new Set(prev); 
          if (isLiked) {
            s.add(selectedVideo.id);
          } else {
            s.delete(selectedVideo.id);
          }
          return s; 
        });
        
        setSelectedVideo(prev => prev ? {
          ...prev,
          likes: isLiked ? prev.likes + 1 : prev.likes - 1
        } : null);
        
        setVideos(prevVideos => prevVideos.map(v => 
          v.id === selectedVideo.id 
            ? { ...v, likes: isLiked ? v.likes + 1 : v.likes - 1 }
            : v
        ));
        
        Alert.alert('Erreur', 'Impossible de mettre à jour le like');
    }
  };

  const handleVideoSave = async () => {
    if (!currentUserId || !selectedVideo || !canInteract) return;
    const isSaved = mySavedVideos.has(selectedVideo.id);
    
    try {
      const uRef = doc(db, 'users', currentUserId);
      if (isSaved) {
        await updateDoc(uRef, { favorites: arrayRemove(selectedVideo.id) });
        Alert.alert("✓", "Retiré des favoris");
      } else {
        await updateDoc(uRef, { favorites: arrayUnion(selectedVideo.id) });
        Alert.alert("✓", "Ajouté aux favoris !");
      }
    } catch (e) { 
      console.error(e); 
      Alert.alert("Erreur", "Impossible de sauvegarder");
    }
  };

  const handleShareProfile = () => {
    setShowShareModal(true);
  };

  const shareOnWhatsApp = async () => {
    if (!profile) return;
    
    const message = `🎓 Découvre le profil de ${profile.displayName || profile.prenom} sur SwipeSkills!\n\n👤 ${videos.length} vidéos | ${followersCount} abonnés\n\n👉 Ouvre l'app pour le découvrir!`;
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    
    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
        setShowShareModal(false);
      } else {
        Alert.alert("Erreur", "WhatsApp n'est pas installé");
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'ouvrir WhatsApp");
    }
  };

  const handleCopyProfileLink = async () => {
    if (!profile) return;
    
    const profileLink = `https://swipeskills.app/profile/${profile.uid}`;
    const shareMessage = `🎓 Découvre le profil de ${profile.displayName || profile.prenom} sur SwipeSkills!\n\n👤 ${videos.length} vidéos | ${followersCount} abonnés\n\n🔗 ${profileLink}`;
    
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(shareMessage);
        alert('✓ Lien copié !');
      } else {
        Clipboard.setString(shareMessage);
        Alert.alert('✓', 'Lien copié dans le presse-papier !');
      }
      setShowShareModal(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de copier le lien');
    }
  };

  const getBadgeInfo = (badge?: 'apprenant' | 'expert' | 'pro') => {
    switch (badge) {
      case 'expert':
        return { icon: 'shield-checkmark', color: '#3B82F6', label: 'Expert Certifié' };
      case 'pro':
        return { icon: 'star', color: '#FBA31A', label: 'Professionnel' };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7459f0" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }
  
  if (!profile) {
    return (
      <View style={styles.center}>
        <Ionicons name="person-circle-outline" size={80} color="#ccc" />
        <Text style={styles.errorText}>Profil introuvable</Text>
      </View>
    );
  }

  const badgeInfo = getBadgeInfo(profile.badge);
  const isOwnProfile = currentUserId === profile.uid;

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <LinearGradient 
            colors={['#7459f0', '#9333ea', '#242a65']} 
            locations={[0, 0.5, 1]}
            style={styles.headerGradient}
          >
            <View style={styles.topActions}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handleShareProfile} style={styles.shareButton}>
                <Ionicons name="share-social-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.avatarContainer}>
              <View style={styles.avatarBorder}>
                {profile.photoURL ? (
                  <Image source={{ uri: profile.photoURL }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {profile.prenom?.[0]?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
              </View>
              
              {badgeInfo && (
                <View style={[styles.badgeLarge, { backgroundColor: badgeInfo.color }]}>
                  <Ionicons name={badgeInfo.icon as any} size={16} color="#fff" />
                  <Text style={styles.badgeLargeText}>{badgeInfo.label}</Text>
                </View>
              )}
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.nameWhite}>{profile.displayName || `${profile.prenom} ${profile.nom}`}</Text>
              
              <View style={styles.roleTagWhite}>
                <Ionicons name="school" size={14} color="#fff" />
                <Text style={styles.roleWhiteText}>Formateur</Text>
              </View>
              
              {profile.createdAt && formatMemberSince(profile.createdAt) && (
                <Text style={styles.memberSince}>
                  Membre depuis {formatMemberSince(profile.createdAt)}
                </Text>
              )}

              <View style={styles.headerStats}>
                <View style={styles.headerStatItem}>
                  <Text style={styles.headerStatValue}>{videos.length}</Text>
                  <Text style={styles.headerStatLabel}>Vidéos</Text>
                </View>
                <View style={styles.headerStatItem}>
                  <Text style={styles.headerStatValue}>{followersCount}</Text>
                  <Text style={styles.headerStatLabel}>Abonnés</Text>
                </View>
                <View style={styles.headerStatItem}>
                  <Text style={styles.headerStatValue}>{totalViews}</Text>
                  <Text style={styles.headerStatLabel}>Vues</Text>
                </View>
                <View style={styles.headerStatItem}>
                  <Text style={styles.headerStatValue}>{totalLikes}</Text>
                  <Text style={styles.headerStatLabel}>J'aime</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {!isOwnProfile && (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={[styles.followBtn, isFollowing && styles.followBtnActive]} 
                onPress={handleFollow}
              >
                <Ionicons 
                  name={isFollowing ? "checkmark-circle" : "person-add"} 
                  size={20} 
                  color={isFollowing ? "#7459f0" : "#fff"} 
                />
                <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                  {isFollowing ? "Abonné" : "Suivre"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.messageBtn} onPress={handleMessage}>
                <Ionicons name="chatbubble-outline" size={20} color="#7459f0" />
                <Text style={styles.messageBtnText}>Message</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {profile.bio && (
          <View style={styles.aboutSection}>
            <Text style={styles.sectionTitle}>À propos</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}

        {profile.interests && profile.interests.length > 0 && (
          <View style={styles.interestsSection}>
            <Text style={styles.sectionTitle}>Domaines d'expertise</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.interestsScroll}>
              {profile.interests.map((interest) => {
                const conf = INTEREST_CONFIG[interest] || { icon: '📚', color: '#F3F4F6', label: interest };
                return (
                  <View key={interest} style={[styles.interestChip, { backgroundColor: conf.color }]}>
                    <Text style={styles.interestIcon}>{conf.icon}</Text>
                    <Text style={styles.interestLabel}>{conf.label}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {categories.length > 1 && (
          <View style={styles.filterSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>
                    {cat === 'all' ? 'Toutes' : cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.videosSection}>
          <View style={styles.videosHeader}>
            <Text style={styles.videosTitle}>Vidéos publiées</Text>
            <View style={styles.videosCount}>
              <Text style={styles.videosCountText}>{filteredVideos.length}</Text>
            </View>
          </View>

          {filteredVideos.length === 0 ? (
            <View style={styles.emptyVideos}>
              <Ionicons name="videocam-off-outline" size={48} color="#ccc" />
              <Text style={styles.emptyVideosText}>Aucune vidéo dans cette catégorie</Text>
            </View>
          ) : (
            <View style={styles.videosGrid}>
              {filteredVideos.map((video) => (
                <TouchableOpacity 
                  key={video.id} 
                  style={styles.videoItem} 
                  onPress={async () => { 
                    try {
                      const videoDoc = await getDoc(doc(db, 'videos', video.id));
                      if (videoDoc.exists()) {
                        const freshData = videoDoc.data();
                        setSelectedVideo({
                          ...video,
                          likes: freshData.likes || 0,
                          comments: freshData.comments || 0,
                          views: freshData.views || 0
                        });
                      } else {
                        setSelectedVideo(video);
                      }
                      setShowPlayer(true);
                    } catch (error) {
                      console.error('Erreur chargement vidéo:', error);
                      setSelectedVideo(video);
                      setShowPlayer(true);
                    }
                  }}
                >
                  {video.thumbnail ? (
                    <Image source={{ uri: video.thumbnail }} style={styles.videoThumbnail} />
                  ) : (
                    <View style={styles.videoPlaceholder}>
                      <Ionicons name="videocam" size={40} color="rgba(255,255,255,0.5)" />
                    </View>
                  )}
                  
                  <LinearGradient 
                    colors={['transparent', 'rgba(0,0,0,0.8)']} 
                    style={styles.videoGradient}
                  >
                    <View style={styles.playIconContainer}>
                      <Ionicons name="play" size={16} color="#fff" />
                    </View>
                    <Text style={styles.videoViews}>{video.views}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        
        <View style={{height: 40}} />
      </ScrollView>

      {/* ✅ MODAL PLAYER CORRIGÉE */}
      <Modal visible={showPlayer && selectedVideo !== null} animationType="slide">
        <View style={styles.playerContainer}>
          {selectedVideo && (
            <>
              <Video 
                ref={videoRef} 
                source={{ uri: selectedVideo.videoUrl }} 
                style={StyleSheet.absoluteFill} 
                resizeMode={ResizeMode.COVER} 
                shouldPlay 
                isLooping 
              />
              
              {/* ✅ INFO VIDÉO REPOSITIONNÉE */}
              <View style={styles.playerBottomInfo}>
                <Text style={styles.playerTitle} numberOfLines={2}>
                  {selectedVideo.title}
                </Text>
                {selectedVideo.description && (
                  <Text style={styles.playerDescription} numberOfLines={3}>
                    {selectedVideo.description}
                  </Text>
                )}
              </View>

              {/* ✅ OPTIONS (UNE SEULE FOIS) */}
              {currentUserId === selectedVideo.creatorId && (
                <TouchableOpacity style={styles.optionsButton} onPress={() => setShowOptions(true)}>
                  <View style={styles.optionsIcon}>
                    <Ionicons name="ellipsis-vertical" size={24} color="white" />
                  </View>
                </TouchableOpacity>
              )}
              
              {/* ✅ ACTIONS */}
              {canInteract && (
                <View style={styles.playerActions}>
                  <TouchableOpacity style={styles.playerAction} onPress={handleVideoLike}>
                    <View style={[styles.playerActionIcon, myLikedVideos.has(selectedVideo.id) && styles.playerActionIconActive]}>
                      <Ionicons 
                        name={myLikedVideos.has(selectedVideo.id) ? "heart" : "heart-outline"} 
                        size={28} 
                        color="#fff" 
                      />
                    </View>
                    <Text style={styles.playerActionText}>{selectedVideo.likes}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.playerAction} onPress={() => setShowComments(true)}>
                    <View style={styles.playerActionIcon}>
                      <Ionicons name="chatbubble-outline" size={28} color="#fff" />
                    </View>
                    <Text style={styles.playerActionText}>{selectedVideo.comments}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.playerAction} onPress={handleVideoSave}>
                    <View style={[styles.playerActionIcon, mySavedVideos.has(selectedVideo.id) && styles.playerActionIconSaved]}>
                      <Ionicons 
                        name={mySavedVideos.has(selectedVideo.id) ? "bookmark" : "bookmark-outline"} 
                        size={28} 
                        color="#fff" 
                      />
                    </View>
                    <Text style={styles.playerActionText}>Sauver</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity onPress={() => setShowPlayer(false)} style={styles.closeButton}>
                <View style={styles.closeIcon}>
                  <Ionicons name="close" size={28} color="white" />
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      <Modal visible={showShareModal} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.shareOverlay} 
          activeOpacity={1} 
          onPress={() => setShowShareModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.shareContentWrapper}>
            <View style={styles.shareContent}>
              <LinearGradient 
                colors={['#7459f0', '#9333ea', '#242A65']} 
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shareHeader}
              >
                <View style={styles.shareHeaderContent}>
                  <Ionicons name="share-social" size={24} color="white" />
                  <Text style={styles.shareTitle}>Partager le profil</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setShowShareModal(false)}
                  style={styles.shareCloseButton}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </LinearGradient>

              <View style={styles.shareOptionsGrid}>
                <TouchableOpacity 
                  style={styles.shareOptionCard} 
                  onPress={shareOnWhatsApp}
                  activeOpacity={0.7}
                >
                  <LinearGradient 
                    colors={['#25D366', '#128C7E']} 
                    style={styles.shareIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="logo-whatsapp" size={36} color="white" />
                  </LinearGradient>
                  <Text style={styles.shareOptionLabel}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.shareOptionCard} 
                  onPress={handleCopyProfileLink}
                  activeOpacity={0.7}
                >
                  <LinearGradient 
                    colors={['#3B82F6', '#2563EB']} 
                    style={styles.shareIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="link" size={36} color="white" />
                  </LinearGradient>
                  <Text style={styles.shareOptionLabel}>Copier le lien</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showOptions} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptions(false)}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.modalOption} 
              onPress={() => {
                setShowOptions(false);
                setEditTitle(selectedVideo?.title || '');
                setEditDescription(selectedVideo?.description || '');
                setIsEditing(true);
              }}
            >
              <Ionicons name="create-outline" size={24} color="#7459f0" />
              <Text style={styles.modalOptionText}>Modifier</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalOption} 
              onPress={() => {
                setShowOptions(false);
                Alert.alert("Supprimer", "Supprimer cette vidéo ?", [
                  { text: "Annuler", style: "cancel" },
                  { text: "Supprimer", style: "destructive", onPress: async () => {
                    try {
                      await deleteDoc(doc(db, 'videos', selectedVideo!.id));
                      setVideos(prev => prev.filter(v => v.id !== selectedVideo!.id));
                      setShowPlayer(false);
                      Alert.alert("✓", "Vidéo supprimée");
                    } catch (e) { 
                      Alert.alert("Erreur", "Impossible de supprimer"); 
                    }
                  }}
                ]);
              }}
            >
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
              <Text style={[styles.modalOptionText, {color: '#EF4444'}]}>Supprimer</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowOptions(false)}>
              <Text style={styles.modalCancelText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isEditing} transparent animationType="slide">
        <View style={styles.editOverlay}>
          <View style={styles.editContent}>
            <Text style={styles.editTitle}>Modifier la vidéo</Text>
            
            <Text style={styles.editLabel}>Titre</Text>
            <TextInput 
              style={styles.editInput} 
              value={editTitle} 
              onChangeText={setEditTitle} 
              placeholder="Titre" 
              placeholderTextColor="#999"
            />
            
            <Text style={styles.editLabel}>Description</Text>
            <TextInput 
              style={[styles.editInput, styles.editTextArea]} 
              value={editDescription} 
              onChangeText={setEditDescription} 
              placeholder="Description" 
              placeholderTextColor="#999"
              multiline 
            />
            
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.editCancel} onPress={() => setIsEditing(false)}>
                <Text style={styles.editCancelText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.editSave} onPress={handleUpdateVideo} disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.editSaveText}>Sauvegarder</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {selectedVideo && canInteract && (
        <CommentModal 
          visible={showComments} 
          videoId={selectedVideo.id} 
          creatorId={selectedVideo.creatorId} 
          videoTitle={selectedVideo.title} 
          onClose={() => setShowComments(false)} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#F8F8F6' },
  container: { flex: 1 },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F8F8F6' 
  },
  loadingText: { 
    color: '#7459f0', 
    fontSize: 16, 
    marginTop: 16, 
    fontWeight: '600' 
  },
  errorText: { 
    color: '#666', 
    fontSize: 18, 
    marginTop: 16 
  },
  
  headerSection: {
    marginBottom: 20
  },
  headerGradient: { 
    paddingTop: 50, 
    paddingHorizontal: 20,
    paddingBottom: 30
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  backButton: { 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  shareButton: {
    backgroundColor: 'rgba(255,255,255,0.2)', 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  
  avatarContainer: { 
    alignItems: 'center', 
    marginBottom: 16,
    position: 'relative'
  },
  avatarBorder: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 4, 
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8
  },
  avatarImg: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 50 
  },
  avatarPlaceholder: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 50, 
    backgroundColor: '#242a65', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  avatarInitial: { 
    fontSize: 40, 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  badgeLarge: {
    position: 'absolute',
    bottom: -10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4
  },
  badgeLargeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  
  headerInfo: {
    alignItems: 'center'
  },
  nameWhite: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#fff',
    marginBottom: 8
  },

  // ✅ INFO VIDÉO REPOSITIONNÉE ET STYLISÉE
  playerBottomInfo: {
    position: 'absolute',
    bottom: 140,
    left: 20,
    right: 100,
    zIndex: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12
  },
  playerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 22
  },
  playerDescription: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    lineHeight: 20
  },
  
  roleTagWhite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 8
  },
  roleWhiteText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600'
  },
  memberSince: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginBottom: 16
  },
  
  headerStats: {
    flexDirection: 'row',
    gap: 30
  },
  headerStatItem: {
    alignItems: 'center'
  },
  headerStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  headerStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2
  },
  
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: -20
  },
  followBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7459f0',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  followBtnActive: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#7459f0'
  },
  followBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15
  },
  followBtnTextActive: {
    color: '#7459f0'
  },
  
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#7459f0',
    paddingVertical: 14,
    borderRadius: 12
  },
  messageBtnText: {
    color: '#7459f0',
    fontWeight: 'bold',
    fontSize: 15
  },
  
  aboutSection: {
    paddingHorizontal: 20,
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#242a65',
    marginBottom: 12
  },
  bioText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22
  },
  
  interestsSection: {
    paddingLeft: 20,
    marginBottom: 20
  },
  interestsScroll: {
    paddingRight: 20,
    gap: 10
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20
  },
  interestIcon: {
    fontSize: 16
  },
  interestLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151'
  },
  
  filterSection: {
    paddingLeft: 20,
    marginBottom: 16
  },
  filterScroll: {
    paddingRight: 20,
    gap: 8
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  filterChipActive: {
    backgroundColor: '#7459f0',
    borderColor: '#7459f0'
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280'
  },
  filterChipTextActive: {
    color: '#fff'
  },
  
  videosSection: {
    paddingHorizontal: 20
  },
  videosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  videosTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#242a65'
  },
  videosCount: {
    backgroundColor: '#7459f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  videosCountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  },
  
  emptyVideos: {
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyVideosText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 12
  },
  
  videosGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    marginHorizontal: -1
  },
  videoItem: { 
    width: ITEM_WIDTH, 
    height: 200, 
    backgroundColor: '#242a65',
    borderRadius: 12,
    overflow: 'hidden',
    margin: 1
  },
  videoThumbnail: { 
    width: '100%', 
    height: '100%' 
  },
  videoPlaceholder: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#1a1a2e'
  },
  videoGradient: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  playIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7459f0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  videoViews: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '700' 
  },
  
  playerContainer: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  optionsButton: { 
    position: 'absolute', 
    top: 50, 
    right: 20 
  },
  optionsIcon: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  
  playerActions: { 
    position: 'absolute', 
    bottom: 120, 
    right: 16, 
    gap: 24 
  },
  playerAction: { 
    alignItems: 'center', 
    gap: 6 
  },
  playerActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  playerActionIconActive: {
    backgroundColor: '#EF4444'
  },
  playerActionIconSaved: {
    backgroundColor: '#FBA31A'
  },
  playerActionText: { 
    color: '#fff', 
    fontSize: 13, 
    fontWeight: '600' 
  },
  
  closeButton: { 
    position: 'absolute', 
    top: 50, 
    left: 20 
  },
  closeIcon: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  
  shareOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.8)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  shareContentWrapper: { 
    width: '100%', 
    maxWidth: 400 
  },
  shareContent: { 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    overflow: 'hidden', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 20, 
    elevation: 10 
  },
  shareHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 24, 
    paddingVertical: 20 
  },
  shareHeaderContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  shareTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  shareCloseButton: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  shareOptionsGrid: { 
    flexDirection: 'row', 
    paddingHorizontal: 20, 
    paddingVertical: 30, 
    gap: 20, 
    justifyContent: 'space-around' 
  },
  shareOptionCard: { 
    alignItems: 'center', 
    gap: 12, 
    flex: 1 
  },
  shareIconGradient: { 
    width: 80, 
    height: 80, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 12, 
    elevation: 12 
  },
  shareOptionLabel: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#374151', 
    textAlign: 'center' 
  },
  
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'flex-end', 
    padding: 20 
  },
  modalContent: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    overflow: 'hidden'
  },
  modalOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 18, 
    borderBottomWidth: 0.5, 
    borderBottomColor: '#E5E7EB', 
    gap: 12 
  },
  modalOptionText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#242a65' 
  },
  modalCancel: { 
    padding: 18, 
    alignItems: 'center' 
  },
  modalCancelText: { 
    fontSize: 16, 
    color: '#666', 
    fontWeight: '500' 
  },
  
  editOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.8)', 
    justifyContent: 'center', 
    padding: 24 
  },
  editContent: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 24
  },
  editTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    textAlign: 'center',
    color: '#242a65'
  },
  editLabel: { 
    fontSize: 13, 
    color: '#666', 
    marginBottom: 8,
    fontWeight: '600'
  },
  editInput: { 
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: '#F9FAFB'
  },
  editTextArea: { 
    height: 100, 
    textAlignVertical: 'top' 
  },
  editActions: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 8 
  },
  editCancel: { 
    flex: 1, 
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center'
  },
  editCancelText: { 
    color: '#666', 
    fontWeight: '600',
    fontSize: 15
  },
  editSave: { 
    flex: 2, 
    backgroundColor: '#7459f0',
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  editSaveText: { 
    color: '#fff', 
    fontWeight: 'bold',
    fontSize: 15
  }
});