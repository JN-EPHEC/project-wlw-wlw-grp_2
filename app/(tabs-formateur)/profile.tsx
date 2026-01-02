import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Alert,
  Share,
  Modal,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { auth, db, storage } from '../../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import { getUserVideos } from '../utils/videoManager';
import { getUserUnlockedBadges } from '../../services/badgeService';

const { width } = Dimensions.get('window');

// Définition des badges disponibles
const ALL_BADGES = [
  { id: 'first_video', name: 'Première Vidéo', icon: '🎬', description: 'Publier votre première vidéo' },
  { id: 'ten_videos', name: '10 Vidéos', icon: '🎯', description: 'Publier 10 vidéos' },
  { id: 'hundred_views', name: '100 Vues', icon: '👀', description: 'Atteindre 100 vues' },
  { id: 'thousand_views', name: '1000 Vues', icon: '🔥', description: 'Atteindre 1000 vues' },
  { id: 'first_like', name: 'Premier J\'aime', icon: '💖', description: 'Recevoir votre premier like' },
  { id: 'popular', name: 'Populaire', icon: '⭐', description: '100 likes reçus' },
  { id: 'influencer', name: 'Influenceur', icon: '🌟', description: '1000 likes reçus' },
  { id: 'consistent', name: 'Régulier', icon: '📅', description: 'Publier 7 jours d\'affilée' },
];

// Catégories
const CATEGORIES = [
  { id: 'digital-marketing', label: 'Marketing Digital', icon: '📱' },
  { id: 'ia', label: 'Intelligence Artificielle', icon: '🤖' },
  { id: 'design', label: 'Design', icon: '🎨' },
  { id: 'development', label: 'Développement', icon: '💻' },
  { id: 'business', label: 'Business', icon: '💼' },
];

export default function ProfileFormateurScreen() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('videos');

  const [editedName, setEditedName] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [editedIntroduction, setEditedIntroduction] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);

  // Nouvelles données
  const [myVideos, setMyVideos] = useState<any[]>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [pinnedVideoId, setPinnedVideoId] = useState<string | null>(null);
  const [totalViews, setTotalViews] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Charger le profil utilisateur
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile(data);
        setEditedName(`${data.prenom || ''} ${data.nom || ''}`);
        setEditedBio(data.bio || "Passionné de partager mes connaissances 🎓");
        setEditedIntroduction(data.introduction || "Bienvenue sur mon profil ! Je partage mes connaissances en marketing digital et IA.");
        setCoverImage(data.coverImage || null);
        setPinnedVideoId(data.pinnedVideoId || null);
      }

      // Charger les vidéos du formateur
      const videos = await getUserVideos(user.uid);
      setMyVideos(videos);

      // Calculer les statistiques totales
      const views = videos.reduce((sum: number, v: any) => sum + (v.viewsCount || 0), 0);
      const likes = videos.reduce((sum: number, v: any) => sum + (v.likesCount || 0), 0);
      setTotalViews(views);
      setTotalLikes(likes);

      // Charger les badges débloqués
      const badges = await getUserUnlockedBadges();
      setUnlockedBadges(badges);

    } catch (error) {
      console.error("Erreur Firebase:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/login');
            } catch (error) {
              console.error('Error signing out:', error);
            }
          }
        }
      ]
    );
  };

  const pickProfileImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Désolé', 'Accès aux photos requis.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadProfileImage(result.assets[0].uri);
    }
  };

  const pickCoverImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Désolé', 'Accès aux photos requis.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!result.canceled) {
      uploadCoverImage(result.assets[0].uri);
    }
  };

  const uploadProfileImage = async (uri: string) => {
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

      Alert.alert("Succès", "Photo de profil mise à jour !");
    } catch (e) {
      Alert.alert("Erreur", "Le téléchargement a échoué.");
    } finally {
      setIsUploading(false);
    }
  };

  const uploadCoverImage = async (uri: string) => {
    const user = auth.currentUser;
    if (!user) return;

    setIsUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileRef = ref(storage, `covers/${user.uid}`);
      await uploadBytes(fileRef, blob);
      const downloadURL = await getDownloadURL(fileRef);

      await updateDoc(doc(db, 'users', user.uid), { coverImage: downloadURL });
      setCoverImage(downloadURL);

      Alert.alert("Succès", "Image de couverture mise à jour !");
    } catch (e) {
      Alert.alert("Erreur", "Le téléchargement a échoué.");
    } finally {
      setIsUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!editedName.trim()) {
      Alert.alert("Erreur", "Le nom ne peut pas être vide");
      return;
    }

    setLoading(true);
    try {
      const [prenom, ...nomArray] = editedName.split(' ');
      await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
        prenom,
        nom: nomArray.join(' '),
        bio: editedBio,
        introduction: editedIntroduction
      });
      setIsEditing(false);
      loadProfile();
      Alert.alert("Succès", "Profil mis à jour !");
    } catch (e) {
      Alert.alert("Erreur", "Mise à jour impossible");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Découvrez mon profil SwipeSkills ! 🎓\n${userProfile.prenom} ${userProfile.nom}`,
        title: 'Mon profil SwipeSkills'
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handlePinVideo = async (videoId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const newPinnedId = pinnedVideoId === videoId ? null : videoId;
      await updateDoc(doc(db, 'users', user.uid), {
        pinnedVideoId: newPinnedId
      });
      setPinnedVideoId(newPinnedId);
      Alert.alert("Succès", newPinnedId ? "Vidéo épinglée" : "Vidéo désépinglée");
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'épingler la vidéo");
    }
  };

  const handleDeleteVideo = (videoId: string) => {
    Alert.alert(
      'Supprimer la vidéo',
      'Êtes-vous sûr de vouloir supprimer cette vidéo ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { deleteVideo } = require('../utils/videoManager');
              await deleteVideo(videoId);
              Alert.alert("Succès", "Vidéo supprimée");
              loadProfile();
            } catch (error) {
              Alert.alert("Erreur", "Impossible de supprimer la vidéo");
            }
          }
        }
      ]
    );
  };

  const getCategoryIcon = (categoryId: string) => {
    const cat = CATEGORIES.find(c => c.id === categoryId);
    return cat?.icon || '📚';
  };

  const getCategoryLabel = (categoryId: string) => {
    const cat = CATEGORIES.find(c => c.id === categoryId);
    return cat?.label || categoryId;
  };

  const earnedBadges = ALL_BADGES.filter(b => unlockedBadges.includes(b.id));
  const nextBadges = ALL_BADGES.filter(b => !unlockedBadges.includes(b.id));

  const renderVideoCard = ({ item, isPinned = false }: { item: any, isPinned?: boolean }) => (
    <TouchableOpacity
      style={styles.videoCard}
      onLongPress={() => {
        Alert.alert(
          'Actions',
          'Que voulez-vous faire ?',
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: pinnedVideoId === item.id ? 'Désépingler' : 'Épingler',
              onPress: () => handlePinVideo(item.id)
            },
            {
              text: 'Supprimer',
              style: 'destructive',
              onPress: () => handleDeleteVideo(item.id)
            }
          ]
        );
      }}
    >
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.videoThumbnail} />
      ) : (
        <View style={[styles.videoThumbnail, styles.videoPlaceholder]}>
          <Ionicons name="videocam" size={40} color="#D1D1D6" />
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.videoGradient}
      />

      {isPinned && (
        <View style={styles.pinnedBadge}>
          <Ionicons name="pin" size={10} color="white" />
          <Text style={styles.pinnedText}>Épinglé</Text>
        </View>
      )}

      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.videoStats}>
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={12} color="white" />
            <Text style={styles.statText}>{item.viewsCount || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="heart-outline" size={12} color="white" />
            <Text style={styles.statText}>{item.likesCount || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading || !userProfile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Header avec image de couverture */}
        <View style={styles.headerWrapper}>
          <TouchableOpacity onPress={pickCoverImage} disabled={isUploading}>
            {coverImage ? (
              <Image source={{ uri: coverImage }} style={styles.coverImage} />
            ) : (
              <LinearGradient
                colors={['#9333ea', '#7e22ce']}
                style={styles.coverGradient}
              >
                <View style={styles.coverPattern}>
                  <View style={[styles.patternCircle, { top: 20, left: 30 }]} />
                  <View style={[styles.patternCircle, { top: 60, right: 20 }]} />
                  <View style={[styles.patternCircle, { top: 10, right: 80 }]} />
                </View>
              </LinearGradient>
            )}

            {/* Icône caméra pour changer la couverture */}
            <View style={styles.cameraIconCover}>
              <Ionicons name="camera" size={16} color="white" />
            </View>
          </TouchableOpacity>

          {/* Boutons d'action en haut */}
          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowShareModal(true)}
            >
              <Ionicons name="share-social-outline" size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.logoutButton]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Photo de profil */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickProfileImage} disabled={isUploading} style={styles.avatarBorder}>
              {isUploading ? (
                <View style={styles.center}>
                  <ActivityIndicator color="white" />
                </View>
              ) : userProfile.photoURL ? (
                <Image source={{ uri: userProfile.photoURL }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInit}>{userProfile.prenom?.[0] || 'F'}</Text>
                </View>
              )}

              <View style={styles.roleBadge}>
                <Ionicons name="school" size={10} color="#9333ea" />
                <Text style={styles.roleText}>Formateur</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Informations du profil */}
        <View style={styles.profileInfo}>
          {isEditing ? (
            <View style={styles.editForm}>
              <TextInput
                style={styles.input}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Nom complet"
                placeholderTextColor="#A1A1AA"
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editedBio}
                onChangeText={setEditedBio}
                placeholder="Bio"
                placeholderTextColor="#A1A1AA"
                multiline
                numberOfLines={2}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editedIntroduction}
                onChangeText={setEditedIntroduction}
                placeholder="Introduction au parcours"
                placeholderTextColor="#A1A1AA"
                multiline
                numberOfLines={3}
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.editButton, styles.cancelButton]}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editButton, styles.saveButton]}
                  onPress={saveProfile}
                >
                  <Text style={styles.saveButtonText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.name}>{userProfile.prenom} {userProfile.nom}</Text>
              <Text style={styles.bio}>{userProfile.bio || "Formateur expert sur SwipeSkills 🎓"}</Text>
              <Text style={styles.memberSince}>
                Membre depuis {new Date(userProfile.createdAt?.toDate?.() || Date.now()).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </Text>

              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={() => setIsEditing(true)}
              >
                <Ionicons name="create-outline" size={16} color="#9333ea" />
                <Text style={styles.editProfileText}>Modifier le profil</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Introduction au parcours */}
        {!isEditing && (
          <View style={styles.introductionCard}>
            <View style={styles.introHeader}>
              <Ionicons name="book" size={16} color="#9333ea" />
              <Text style={styles.introTitle}>Introduction au parcours</Text>
            </View>
            <Text style={styles.introText}>
              {userProfile.introduction || editedIntroduction}
            </Text>
          </View>
        )}

        {/* Statistiques */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{totalViews}</Text>
            <Text style={styles.statLabel}>Vues totales</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{totalLikes} 💖</Text>
            <Text style={styles.statLabel}>J'aime</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{myVideos.length}</Text>
            <Text style={styles.statLabel}>Vidéos</Text>
          </View>
        </View>

        {/* Centres d'intérêt */}
        <View style={styles.interestsSection}>
          <Text style={styles.sectionTitle}>Centres d'intérêt</Text>
          <View style={styles.interestsList}>
            {(userProfile.interests || ['digital-marketing', 'ia']).map((interest: string) => (
              <View key={interest} style={styles.interestBadge}>
                <Text style={styles.interestText}>
                  {getCategoryIcon(interest)} {getCategoryLabel(interest)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Onglets */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
            onPress={() => setActiveTab('videos')}
          >
            <Text style={styles.tabEmoji}>🎬</Text>
            <Text style={[styles.tabLabel, activeTab === 'videos' && styles.activeLabel]}>
              Mes vidéos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'badges' && styles.activeTab]}
            onPress={() => setActiveTab('badges')}
          >
            <Text style={styles.tabEmoji}>🏆</Text>
            <Text style={[styles.tabLabel, activeTab === 'badges' && styles.activeLabel]}>
              Badges
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contenu des onglets */}
        <View style={styles.tabContent}>
          {activeTab === 'videos' && (
            <View>
              {myVideos.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="videocam-outline" size={60} color="#D1D1D6" />
                  <Text style={styles.emptyText}>Aucune vidéo publiée</Text>
                  <Text style={styles.emptySubtext}>
                    Commencez à créer du contenu éducatif
                  </Text>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={() => router.push('/(tabs-formateur)/upload')}
                  >
                    <Ionicons name="add-circle" size={20} color="white" />
                    <Text style={styles.uploadButtonText}>Publier une vidéo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.videosGrid}>
                  {/* Vidéo épinglée en premier */}
                  {pinnedVideoId && myVideos.find(v => v.id === pinnedVideoId) && (
                    <View style={styles.pinnedVideoContainer}>
                      {renderVideoCard({
                        item: myVideos.find(v => v.id === pinnedVideoId)!,
                        isPinned: true
                      })}
                    </View>
                  )}

                  {/* Autres vidéos */}
                  <FlatList
                    data={myVideos.filter(v => v.id !== pinnedVideoId)}
                    renderItem={({ item }) => renderVideoCard({ item })}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    columnWrapperStyle={styles.videoRow}
                    scrollEnabled={false}
                  />
                </View>
              )}
            </View>
          )}

          {activeTab === 'badges' && (
            <View style={styles.badgesSection}>
              {earnedBadges.length > 0 && (
                <View style={styles.badgesGroup}>
                  <View style={styles.badgesSectionHeader}>
                    <Text style={styles.badgesTitle}>Badges débloqués</Text>
                    <Text style={styles.badgesCount}>
                      {earnedBadges.length}/{ALL_BADGES.length}
                    </Text>
                  </View>
                  <View style={styles.badgesGrid}>
                    {earnedBadges.map((badge) => (
                      <View key={badge.id} style={styles.badgeCard}>
                        <Text style={styles.badgeIcon}>{badge.icon}</Text>
                        <Text style={styles.badgeName}>{badge.name}</Text>
                        <Text style={styles.badgeDescription}>{badge.description}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {nextBadges.length > 0 && (
                <View style={styles.badgesGroup}>
                  <Text style={styles.badgesTitle}>Prochains badges</Text>
                  <View style={styles.badgesGrid}>
                    {nextBadges.slice(0, 4).map((badge) => (
                      <View key={badge.id} style={[styles.badgeCard, styles.lockedBadge]}>
                        <Text style={styles.badgeIconLocked}>{badge.icon}</Text>
                        <Text style={styles.badgeNameLocked}>{badge.name}</Text>
                        <Text style={styles.badgeDescriptionLocked}>{badge.description}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {earnedBadges.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.badgeIconLarge}>🏆</Text>
                  <Text style={styles.emptyText}>Aucun badge débloqué</Text>
                  <Text style={styles.emptySubtext}>
                    Publiez des vidéos pour débloquer vos premiers badges !
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal de partage */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Partager ce profil</Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Ionicons name="close" size={24} color="#18181B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Partagez votre profil avec vos amis et collègues
            </Text>

            <TouchableOpacity
              style={styles.shareOption}
              onPress={() => {
                handleShare();
                setShowShareModal(false);
              }}
            >
              <Ionicons name="share-social" size={24} color="#9333ea" />
              <Text style={styles.shareOptionText}>Partager via...</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareOption}
              onPress={() => {
                // TODO: Copier le lien
                Alert.alert("Succès", "Lien copié !");
                setShowShareModal(false);
              }}
            >
              <Ionicons name="link" size={24} color="#9333ea" />
              <Text style={styles.shareOptionText}>Copier le lien</Text>
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
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header & Cover
  headerWrapper: {
    height: 200,
    marginBottom: 70,
  },
  coverImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  coverGradient: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  coverPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.1,
  },
  patternCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
  },
  cameraIconCover: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
  },
  topActions: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
  },

  // Avatar
  avatarSection: {
    position: 'absolute',
    bottom: -60,
    width: width,
    alignItems: 'center',
  },
  avatarBorder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'white',
    backgroundColor: '#9333ea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'visible',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarCircle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#9333ea',
  },
  avatarInit: {
    color: 'white',
    fontSize: 45,
    fontWeight: 'bold',
  },
  roleBadge: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#F3E8FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  roleText: {
    fontSize: 10,
    color: '#9333ea',
    fontWeight: 'bold',
    marginLeft: 4,
  },

  // Profile Info
  profileInfo: {
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: 10,
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#18181B',
  },
  bio: {
    fontSize: 14,
    color: '#71717A',
    marginTop: 6,
    textAlign: 'center',
  },
  memberSince: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 4,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    backgroundColor: 'white',
  },
  editProfileText: {
    color: '#9333ea',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Edit Form
  editForm: {
    width: '100%',
  },
  input: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    fontSize: 14,
    color: '#18181B',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#71717A',
    fontWeight: '600',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#9333ea',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },

  // Introduction Card
  introductionCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 16,
  },
  introHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  introTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginLeft: 8,
  },
  introText: {
    fontSize: 13,
    color: '#18181B',
    lineHeight: 20,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statNum: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#18181B',
  },
  statLabel: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 4,
  },

  // Interests
  interestsSection: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#18181B',
    marginBottom: 12,
  },
  interestsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestBadge: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  interestText: {
    fontSize: 12,
    color: '#9333ea',
    fontWeight: '500',
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: '#F9FAFB',
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  activeTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabEmoji: {
    fontSize: 16,
  },
  tabLabel: {
    fontSize: 13,
    color: '#71717A',
    fontWeight: '600',
  },
  activeLabel: {
    color: '#9333ea',
  },

  // Tab Content
  tabContent: {
    marginTop: 20,
    paddingHorizontal: 20,
  },

  // Videos
  videosGrid: {
    marginBottom: 20,
  },
  pinnedVideoContainer: {
    marginBottom: 16,
  },
  videoRow: {
    gap: 12,
    marginBottom: 12,
  },
  videoCard: {
    flex: 1,
    aspectRatio: 9 / 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  videoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  pinnedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9333ea',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  pinnedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  videoInfo: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  videoTitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  videoStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: 'white',
    fontSize: 11,
  },

  // Badges
  badgesSection: {
    marginBottom: 20,
  },
  badgesGroup: {
    marginBottom: 24,
  },
  badgesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#18181B',
  },
  badgesCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9333ea',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: (width - 64) / 2,
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  badgeIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#18181B',
    textAlign: 'center',
  },
  badgeDescription: {
    fontSize: 11,
    color: '#71717A',
    textAlign: 'center',
    marginTop: 4,
  },
  lockedBadge: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    opacity: 0.6,
  },
  badgeIconLocked: {
    fontSize: 40,
    marginBottom: 8,
    opacity: 0.5,
  },
  badgeNameLocked: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717A',
    textAlign: 'center',
  },
  badgeDescriptionLocked: {
    fontSize: 11,
    color: '#A1A1AA',
    textAlign: 'center',
    marginTop: 4,
  },
  badgeIconLarge: {
    fontSize: 60,
    marginBottom: 8,
  },

  // Empty States
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717A',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#A1A1AA',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9333ea',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  uploadButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },

  // Share Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#18181B',
  },
  modalDescription: {
    fontSize: 14,
    color: '#71717A',
    marginBottom: 24,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
    gap: 16,
  },
  shareOptionText: {
    fontSize: 16,
    color: '#18181B',
    fontWeight: '500',
  },
});
