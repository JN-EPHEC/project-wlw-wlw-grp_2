import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TextInput, ScrollView, 
  TouchableOpacity, Image, Platform, Modal, Dimensions, ActivityIndicator, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av'; 
import { LinearGradient } from 'expo-linear-gradient';

// --- IMPORTS FIREBASE ---
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  deleteDoc, 
  doc,
  getDoc,
  serverTimestamp 
} from 'firebase/firestore'; 
import { db, auth } from '../../firebaseConfig'; 

const { width, height } = Dimensions.get('window');

// --- CATÉGORIES AVEC EMOJIS AMÉLIORÉS ---
const CATEGORIES = [
  { id: 'all', label: 'Tout', icon: '🌟', emoji: '✨' },
  { id: 'digital-marketing', label: 'Marketing Digital', icon: '📱', emoji: '📱' },
  { id: 'ia', label: 'Intelligence Artificielle', icon: '🤖', emoji: '🤖' },
  { id: 'ecommerce', label: 'E-commerce', icon: '🛒', emoji: '🛒' },
  { id: 'design', label: 'Design', icon: '🎨', emoji: '🎨' },
  { id: 'dev', label: 'Développement', icon: '💻', emoji: '💻' },
  { id: 'business', label: 'Business', icon: '📊', emoji: '📊' },
];

// Mapping pour les emojis de médailles TOP
const TOP_MEDALS = ['🥇', '🥈', '🥉'];

// --- TYPES ---
interface VideoData {
  id: string;
  title: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  category: string;
  description?: string;
  views?: number;
  likes?: number;
  createdAt?: any;
  tags?: string[];
}

interface CreatorData {
  id: string;
  name: string;
  photoURL?: string;
  followers?: number;
  videosCount?: number;
  bio?: string;
  category?: string;
}

export default function RechercheScreen() {
  // --- ÉTATS ---
  const [activeTab, setActiveTab] = useState<'videos' | 'creators'>('videos');
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [selectedCat, setSelectedCat] = useState('all'); 
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [creators, setCreators] = useState<CreatorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCreators, setLoadingCreators] = useState(false);
  const [creatorsLoaded, setCreatorsLoaded] = useState(false);
  
  // États pour les Modals (Vidéo & Profil)
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<CreatorData | null>(null);
  const [creatorVideos, setCreatorVideos] = useState<VideoData[]>([]);

  // --- FONCTIONS UTILITAIRES (AVANT LES USEMEMO) ---
  const getCategoryLabel = (category: string): string => {
    const cat = CATEGORIES.find(c => c.id.toLowerCase() === category.toLowerCase());
    return cat ? cat.label : category;
  };

  const getCategoryEmoji = (category: string): string => {
    const cat = CATEGORIES.find(c => c.id.toLowerCase() === category.toLowerCase());
    return cat ? cat.emoji : '📚';
  };

  // --- CHARGEMENT VIDÉOS FIREBASE ---
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const videosRef = collection(db, "videos");
        const querySnapshot = await getDocs(videosRef);
        const videoList: VideoData[] = [];
        
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          
          videoList.push({
            id: docSnap.id,
            title: data.title || 'Sans titre',
            creatorId: data.creatorId || data.userId || '',
            creatorName: data.creatorName || data.creator || 'Formateur',
            creatorAvatar: data.creatorAvatar || data.creatorPhotoURL,
            videoUrl: data.videoUrl || data.videoURL || '',
            thumbnailUrl: data.thumbnailUrl || data.thumbnail,
            category: data.category || 'general',
            description: data.description || '',
            views: data.views || 0,
            likes: data.likes || 0,
            createdAt: data.createdAt,
            tags: data.tags || []
          });
        });
        
        // Enrichir avec les vrais noms des créateurs
        const enrichedVideos = await Promise.all(
          videoList.map(async (video) => {
            try {
              const userDoc = await getDoc(doc(db, 'users', video.creatorId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                return {
                  ...video,
                  creatorName: userData.displayName || 
                               `${userData.prenom || ''} ${userData.nom || ''}`.trim() || 
                               userData.nom || 
                               video.creatorName
                };
              }
              return video;
            } catch (e) {
              return video;
            }
          })
        );
        
        // Trier par score de popularité (likes + vues) décroissant
        enrichedVideos.sort((a, b) => {
          const scoreA = (a.likes || 0) + (a.views || 0);
          const scoreB = (b.likes || 0) + (b.views || 0);
          
          if (scoreA !== scoreB) {
            return scoreB - scoreA;
          }
          
          if (a.createdAt && b.createdAt) {
            return b.createdAt.seconds - a.createdAt.seconds;
          }
          
          return 0;
        });
        
        setVideos(enrichedVideos);
      } catch (error) {
        console.error("Erreur chargement vidéos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  // --- CHARGEMENT CRÉATEURS FIREBASE (OPTIMISÉ) ---
  useEffect(() => {
    if (activeTab === 'creators' && !creatorsLoaded) {
      const fetchCreators = async () => {
        try {
          setLoadingCreators(true);
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("role", "==", "formateur"));
          
          const querySnapshot = await getDocs(q);
          
          // Charger en parallèle pour optimiser
          const promises = querySnapshot.docs.map(async (userDoc) => {
            const data = userDoc.data();
            
            const videosRef = collection(db, "videos");
            const creatorVideosQuery = query(videosRef, where("creatorId", "==", userDoc.id));
            
            const abonnementsRef = collection(db, "abonnements");
            const followersQuery = query(abonnementsRef, where("formateurId", "==", userDoc.id));
            
            const [videosSnapshot, followersSnapshot] = await Promise.all([
              getDocs(creatorVideosQuery),
              getDocs(followersQuery)
            ]);
            
            return {
              id: userDoc.id,
              name: data.nom || data.name || 'Utilisateur',
              photoURL: data.photoURL || data.photo,
              followers: followersSnapshot.size,
              videosCount: videosSnapshot.size,
              bio: data.bio || '',
              category: data.category || data.specialite
            };
          });
          
          const results = await Promise.all(promises);
          setCreators(results);
          setCreatorsLoaded(true);
        } catch (error) {
          console.error("Erreur chargement créateurs:", error);
        } finally {
          setLoadingCreators(false);
        }
      };
      fetchCreators();
    }
  }, [activeTab, creatorsLoaded]);

  // --- CHARGEMENT DES ABONNEMENTS ---
  useEffect(() => {
    const loadFollowedCreators = async () => {
      try {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) return;

        const abonnementsRef = collection(db, "abonnements");
        const q = query(abonnementsRef, where("apprenantId", "==", currentUserId));
        
        const querySnapshot = await getDocs(q);
        const followedList: string[] = [];
        
        querySnapshot.forEach(docSnap => {
          followedList.push(docSnap.data().formateurId);
        });
        
        setFollowedIds(followedList);
      } catch (error) {
        console.error("Erreur chargement abonnements:", error);
      }
    };

    loadFollowedCreators();
  }, []);

  // --- CHARGEMENT VIDÉOS D'UN CRÉATEUR ---
  const loadCreatorVideos = async (creatorId: string) => {
    try {
      const videosRef = collection(db, "videos");
      const q = query(videosRef, where("creatorId", "==", creatorId));
      
      const querySnapshot = await getDocs(q);
      const videoList: VideoData[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        videoList.push({
          id: docSnap.id,
          title: data.title || 'Sans titre',
          creatorId: data.creatorId || '',
          creatorName: data.creatorName || 'Inconnu',
          creatorAvatar: data.creatorAvatar,
          videoUrl: data.videoUrl || '',
          thumbnailUrl: data.thumbnailUrl,
          category: data.category || 'general',
          description: data.description || '',
          views: data.views || 0,
          likes: data.likes || 0,
          tags: data.tags || []
        });
      });
      
      setCreatorVideos(videoList);
    } catch (error) {
      console.error("Erreur chargement vidéos créateur:", error);
    }
  };

  // --- LOGIQUE DE FILTRE VIDÉOS ---
  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      const searchLower = search.toLowerCase().trim();
      
      const matchesSearch = searchLower === '' ||
        v.title.toLowerCase().includes(searchLower) ||
        v.description?.toLowerCase().includes(searchLower) ||
        v.creatorName.toLowerCase().includes(searchLower) ||
        v.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
        getCategoryLabel(v.category).toLowerCase().includes(searchLower);

      const matchesCategory = selectedCat === 'all' || 
        v.category.toLowerCase() === selectedCat.toLowerCase() ||
        v.category.toLowerCase().includes(selectedCat.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [videos, search, selectedCat]);

  // --- FILTRE CRÉATEURS ---
  const filteredCreators = useMemo(() => {
    return creators.filter(c => {
      const searchLower = search.toLowerCase().trim();
      
      const matchesSearch = searchLower === '' ||
        c.name.toLowerCase().includes(searchLower) ||
        c.bio?.toLowerCase().includes(searchLower) ||
        c.category?.toLowerCase().includes(searchLower);
      
      const matchesCategory = selectedCat === 'all' || 
        c.category?.toLowerCase() === selectedCat.toLowerCase() ||
        c.category?.toLowerCase().includes(selectedCat.toLowerCase());
      
      return matchesSearch && matchesCategory;
    });
  }, [creators, search, selectedCat]);

  // --- ACTIONS ---
  const handleSearch = () => {
    if (search.trim().length > 0) {
      setHistory(prev => [search, ...prev.filter(item => item !== search)].slice(0, 5));
    }
  };

  const deleteFromHistory = (itemToDelete: string) => {
    setHistory(prev => prev.filter(item => item !== itemToDelete));
  };

  const toggleFollow = async (formateurId: string) => {
    try {
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId) {
        Alert.alert("Erreur", "Vous devez être connecté pour suivre un formateur");
        return;
      }

      const abonnementsRef = collection(db, "abonnements");
      const q = query(
        abonnementsRef,
        where("apprenantId", "==", currentUserId),
        where("formateurId", "==", formateurId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        await addDoc(abonnementsRef, {
          apprenantId: currentUserId,
          formateurId: formateurId,
          dateAbonnement: serverTimestamp()
        });
        setFollowedIds(prev => [...prev, formateurId]);
      } else {
        const abonnementDoc = querySnapshot.docs[0];
        await deleteDoc(doc(db, "abonnements", abonnementDoc.id));
        setFollowedIds(prev => prev.filter(id => id !== formateurId));
      }
    } catch (error) {
      console.error("Erreur toggle follow:", error);
      Alert.alert("Erreur", "Impossible de modifier l'abonnement");
    }
  };

  const handleCreatorClick = async (creator: CreatorData) => {
    setSelectedCreator(creator);
    await loadCreatorVideos(creator.id);
  };

  const activeCategoryLabel = CATEGORIES.find(c => c.id === selectedCat)?.label || 'Filtres';

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Recherche</Text>
        
        <View style={styles.searchRow}>
          <View style={styles.searchBarContainer}>
            <TextInput 
              style={styles.input} 
              placeholder={activeTab === 'videos' ? "Rechercher (Titre, Sujet...)" : "Rechercher un formateur..."}
              value={search} 
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity onPress={handleSearch} style={{padding: 5}}>
              <Ionicons name="search" size={20} color="#9333EA" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
            <Ionicons name="funnel" size={20} color={selectedCat !== 'all' ? "#9333EA" : "#18181B"} />
            {selectedCat !== 'all' && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>

        {/* TABS */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={styles.tab}
            onPress={() => setActiveTab('videos')}
            activeOpacity={0.8}
          >
            {activeTab === 'videos' ? (
              <LinearGradient
                colors={['#7459f0', '#9333ea', '#242A65']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.activeTabGradient}
              >
                <Text style={styles.activeTabText}>Vidéos</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.tabText}>Vidéos</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tab}
            onPress={() => setActiveTab('creators')}
            activeOpacity={0.8}
          >
            {activeTab === 'creators' ? (
              <LinearGradient
                colors={['#7459f0', '#9333ea', '#242A65']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.activeTabGradient}
              >
                <Text style={styles.activeTabText}>Formateurs</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.tabText}>Formateurs</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENT */}
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardDismissMode="on-drag">
        
        {selectedCat !== 'all' && (
          <View style={styles.activeFilterBadge}>
            <Text style={styles.activeFilterText}>Filtre : {activeCategoryLabel}</Text>
            <TouchableOpacity onPress={() => setSelectedCat('all')}>
              <Ionicons name="close-circle" size={18} color="#9333EA" style={{marginLeft: 5}}/>
            </TouchableOpacity>
          </View>
        )}

        {loading && activeTab === 'videos' ? (
          <ActivityIndicator size="large" color="#9333EA" style={{marginTop: 50}} />
        ) : loadingCreators && activeTab === 'creators' ? (
          <ActivityIndicator size="large" color="#9333EA" style={{marginTop: 50}} />
        ) : (
          <>
            {activeTab === 'videos' && (
              <>
                <Text style={styles.sectionTitle}>
                  {search ? `Résultats (${filteredVideos.length})` : "🔥 Tendances"}
                </Text>
                
                {filteredVideos.length === 0 ? (
                  <View style={{alignItems: 'center', marginTop: 30}}>
                    <Ionicons name="search-outline" size={50} color="#D1D5DB" />
                    <Text style={styles.emptyText}>
                      {search ? `Aucune vidéo trouvée pour "${search}"` : "Aucune vidéo disponible"}
                    </Text>
                  </View>
                ) : (
                  filteredVideos.map((video, index) => {
                    const isTopThree = search === '' && index < 3;
                    
                    return (
                      <TouchableOpacity 
                        key={video.id} 
                        style={[
                          styles.videoCard,
                          isTopThree && styles.topVideoCard
                        ]}
                        onPress={() => setSelectedVideo(video)}
                      >
                        {/* Emoji catégorie + médaille TOP */}
                        <View style={styles.emojiContainer}>
                          <Text style={styles.categoryEmoji}>
                            {getCategoryEmoji(video.category)}
                          </Text>
                          {isTopThree && (
                            <Text style={styles.medalEmoji}>{TOP_MEDALS[index]}</Text>
                          )}
                        </View>
                        
                        {/* Infos vidéo */}
                        <View style={styles.videoInfo}>
                          <Text style={styles.vTitle} numberOfLines={2}>{video.title}</Text>
                          <Text style={styles.vCreator}>Par {video.creatorName}</Text>
                          
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryText}>{getCategoryLabel(video.category)}</Text>
                          </View>
                          
                          <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                              <Text style={styles.statText}>👁️ {video.views?.toLocaleString() || 0}</Text>
                            </View>
                            <View style={styles.statItem}>
                              <Text style={styles.statText}>❤️ {video.likes?.toLocaleString() || 0}</Text>
                            </View>
                          </View>
                        </View>

                        <Ionicons name="chevron-forward" size={20} color="#D4D4D8" />
                      </TouchableOpacity>
                    );
                  })
                )}
                
                {history.length > 0 && search === '' && (
                  <View style={styles.historySection}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.sectionTitle}>📜 Recherches récentes</Text>
                      <TouchableOpacity onPress={() => setHistory([])}>
                        <Text style={styles.clearAllText}>Tout effacer</Text>
                      </TouchableOpacity>
                    </View>
                    {history.map((item, index) => (
                      <View key={index} style={styles.historyRow}>
                        <TouchableOpacity 
                          style={styles.historyClickable} 
                          onPress={() => setSearch(item)}
                        >
                          <Ionicons name="time-outline" size={20} color="#A1A1AA" />
                          <Text style={styles.historyText}>{item}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteFromHistory(item)}>
                          <Ionicons name="close" size={18} color="#A1A1AA" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {activeTab === 'creators' && (
              <>
                <Text style={styles.sectionTitle}>
                  {search ? `Résultats (${filteredCreators.length})` : "⭐ Formateurs suggérés"}
                </Text>
                {filteredCreators.length === 0 ? (
                  <View style={{alignItems: 'center', marginTop: 30}}>
                    <Ionicons name="people-outline" size={50} color="#D1D5DB" />
                    <Text style={styles.emptyText}>
                      {search ? "Aucun formateur trouvé" : "Aucun formateur disponible"}
                    </Text>
                  </View>
                ) : (
                  filteredCreators.map(creator => (
                    <TouchableOpacity 
                      key={creator.id} 
                      style={styles.creatorCard}
                      onPress={() => handleCreatorClick(creator)}
                    >
                      <Image 
                        source={{ uri: creator.photoURL || 'https://via.placeholder.com/150' }} 
                        style={styles.avatar} 
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.creatorName}>{creator.name}</Text>
                        <Text style={styles.creatorFollowers}>
                          {creator.followers?.toLocaleString() || 0} abonnés • {creator.videosCount || 0} vidéos
                        </Text>
                        {creator.category && (
                          <Text style={styles.creatorCategory}>
                            {getCategoryEmoji(creator.category)} {getCategoryLabel(creator.category)}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.followBtnWrapper}
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleFollow(creator.id);
                        }}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={followedIds.includes(creator.id) ? ['#FBA31A', '#F59E0B'] : ['#7459f0', '#9333ea', '#242A65']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.followBtn}
                        >
                          <Text style={styles.followBtnText}>
                            {followedIds.includes(creator.id) ? 'Suivi' : 'Suivre'}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* MODAL FILTRES */}
      <Modal visible={showFilterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrer par sujet</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {CATEGORIES.map(cat => (
                <TouchableOpacity 
                  key={cat.id} 
                  style={[styles.filterOption, selectedCat === cat.id && {backgroundColor: '#F3E8FF'}]} 
                  onPress={() => { setSelectedCat(cat.id); setShowFilterModal(false); }}
                >
                  <Text style={{ fontSize: 22 }}>{cat.icon}</Text>
                  <Text style={[styles.filterLabel, selectedCat === cat.id && { color: '#9333EA', fontWeight: 'bold' }]}>
                    {cat.label}
                  </Text>
                  {selectedCat === cat.id && <Ionicons name="checkmark-circle" size={22} color="#9333EA" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL PROFIL FORMATEUR */}
      <Modal visible={selectedCreator !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedCreator(null)}>
        <View style={[styles.container, {paddingTop: 20}]}>
          <View style={{flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20}}>
            <TouchableOpacity onPress={() => setSelectedCreator(null)} style={{padding: 10, backgroundColor: '#F3F4F6', borderRadius: 20}}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {selectedCreator && (
            <ScrollView contentContainerStyle={{padding: 20, alignItems: 'center'}}>
              <Image source={{ uri: selectedCreator.photoURL || 'https://via.placeholder.com/150' }} 
                style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 15 }} />
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1F2937' }}>{selectedCreator.name}</Text>
              {selectedCreator.category && (
                <Text style={{ color: '#6B7280', marginBottom: 10, textAlign: 'center' }}>
                  {`Expert en ${getCategoryLabel(selectedCreator.category)}`}
                </Text>
              )}
              <Text style={{ color: '#6B7280', marginBottom: 20 }}>
                {selectedCreator.followers?.toLocaleString() || 0} abonnés • {selectedCreator.videosCount || 0} vidéos
              </Text>
              
              {selectedCreator.bio && (
                <Text style={{ color: '#4B5563', textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 }}>
                  {selectedCreator.bio}
                </Text>
              )}
              
              <TouchableOpacity
                onPress={() => toggleFollow(selectedCreator.id)}
                activeOpacity={0.8}
                style={{ width: 200, marginBottom: 30 }}
              >
                <LinearGradient
                  colors={followedIds.includes(selectedCreator.id) ? ['#FBA31A', '#F59E0B'] : ['#7459f0', '#9333ea', '#242A65']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.followBtnLarge}
                >
                  <Text style={styles.followBtnLargeText}>
                    {followedIds.includes(selectedCreator.id) ? 'Abonné(e)' : "S'abonner"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider} />

              <Text style={[styles.sectionTitle, {alignSelf: 'flex-start'}]}>📚 Ses cours disponibles</Text>
              
              {creatorVideos.length > 0 ? (
                creatorVideos.map((video) => (
                  <TouchableOpacity 
                    key={video.id} 
                    style={[styles.videoCard, {width: '100%'}]}
                    onPress={() => { setSelectedCreator(null); setTimeout(() => setSelectedVideo(video), 400); }}
                  >
                    <View style={styles.emojiContainer}>
                      <Text style={styles.categoryEmoji}>{getCategoryEmoji(video.category)}</Text>
                    </View>
                    
                    <View style={styles.videoInfo}>
                      <Text style={styles.vTitle}>{video.title}</Text>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{getCategoryLabel(video.category)}</Text>
                      </View>
                      <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                          <Text style={styles.statText}>👁️ {video.views?.toLocaleString() || 0}</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statText}>❤️ {video.likes?.toLocaleString() || 0}</Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons name="play-circle" size={32} color="#9333EA" />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyText}>Ce formateur n'a pas encore publié de vidéo.</Text>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* MODAL VIDÉO PLAYER */}
      <Modal visible={selectedVideo !== null} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setSelectedVideo(null)}>
        <View style={styles.videoModalContainer}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedVideo(null)}>
            <Ionicons name="close" size={30} color="#FFF" />
          </TouchableOpacity>

          {selectedVideo && (
            <>
              <View style={styles.videoPlayerContainer}>
                <Video
                  style={styles.videoPlayer}
                  source={{ uri: selectedVideo.videoUrl }}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={true}
                />
              </View>
              
              <ScrollView style={styles.videoDetailsScroll}>
                <View style={styles.videoDetails}>
                  <Text style={styles.videoModalTitle}>{selectedVideo.title}</Text>
                  
                  <View style={{flexDirection: 'row', alignItems: 'center', marginVertical: 15}}>
                    {selectedVideo.creatorAvatar && (
                      <Image source={{ uri: selectedVideo.creatorAvatar }} 
                        style={{width: 40, height: 40, borderRadius: 20, marginRight: 12}} />
                    )}
                    <View style={{flex: 1}}>
                      <Text style={styles.videoModalCreator}>{selectedVideo.creatorName}</Text>
                      <View style={{flexDirection: 'row', gap: 15, marginTop: 5}}>
                        <Text style={{color: '#9CA3AF', fontSize: 13}}>
                          👁️ {selectedVideo.views?.toLocaleString() || 0} vues
                        </Text>
                        <Text style={{color: '#9CA3AF', fontSize: 13}}>
                          ❤️ {selectedVideo.likes?.toLocaleString() || 0} likes
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>
                      {getCategoryEmoji(selectedVideo.category)} {getCategoryLabel(selectedVideo.category)}
                    </Text>
                  </View>
                  
                  <Text style={styles.videoModalDesc}>
                    {selectedVideo.description || "Pas de description disponible."}
                  </Text>
                  
                  {selectedVideo.tags && selectedVideo.tags.length > 0 && (
                    <View style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: 20, gap: 8, marginBottom: 40}}>
                      {selectedVideo.tags.map((tag, idx) => (
                        <View key={idx} style={[styles.tagBadge, {backgroundColor: '#374151'}]}>
                          <Text style={[styles.tagText, {color: '#FFF'}]}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingHorizontal: 20, 
    paddingBottom: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 15, color: '#1F2937' },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 15, alignItems: 'center' },
  searchBarContainer: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', 
    borderRadius: 12, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#E5E7EB' 
  },
  input: { flex: 1, fontSize: 16, color: '#333' },
  filterBtn: { 
    width: 50, height: 50, backgroundColor: '#F9FAFB', borderRadius: 12, 
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' 
  },
  filterDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, backgroundColor: '#9333EA', borderRadius: 4 },
  tabContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#F3F4F6', 
    borderRadius: 12, 
    padding: 4 
  },
  tab: { 
    flex: 1, 
    alignItems: 'center', 
    borderRadius: 10,
    overflow: 'hidden'
  },
  activeTabGradient: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10
  },
  tabText: { 
    fontWeight: '600', 
    color: '#71717A',
    paddingVertical: 10
  },
  activeTabText: { 
    color: '#FFF',
    fontWeight: '600'
  },
  activeFilterBadge: { 
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', 
    backgroundColor: '#F3E8FF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginBottom: 15 
  },
  activeFilterText: { color: '#9333EA', fontWeight: 'bold', fontSize: 12 },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#1F2937' },
  emptyText: { color: '#9CA3AF', fontStyle: 'italic', marginTop: 10, textAlign: 'center', fontSize: 15 },
  
  // CARTE VIDÉO AMÉLIORÉE
  videoCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    padding: 15, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#F3F4F6',
    shadowColor: "#000", 
    shadowOffset: {width: 0, height: 2}, 
    shadowOpacity: 0.08, 
    shadowRadius: 4, 
    elevation: 3,
  },
  topVideoCard: {
    borderWidth: 2,
    borderColor: '#7459f0',
    backgroundColor: '#FEFBFF',
    shadowColor: "#7459f0",
    shadowOpacity: 0.15,
  },
  
  // EMOJI CATÉGORIE
  emojiContainer: {
    width: 70,
    height: 70,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F6',
    borderRadius: 12,
    position: 'relative'
  },
  categoryEmoji: {
    fontSize: 36,
  },
  medalEmoji: {
    position: 'absolute',
    top: -8,
    right: -8,
    fontSize: 24,
  },
  
  videoInfo: { flex: 1 },
  vTitle: { fontWeight: 'bold', fontSize: 15, color: '#1F2937', marginBottom: 4, lineHeight: 20 },
  vCreator: { color: '#71717A', fontSize: 13, marginBottom: 8 },
  
  categoryBadge: { 
    alignSelf: 'flex-start',
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8, 
    backgroundColor: '#E9D5FF',
    marginBottom: 8
  },
  categoryText: { 
    fontSize: 11, 
    fontWeight: '600', 
    color: '#7459f0' 
  },
  
  // STATS (vues + likes)
  statsRow: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 4
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500'
  },
  
  historySection: { marginTop: 30 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  clearAllText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  historyRow: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' 
  },
  historyClickable: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  historyText: { fontSize: 16, color: '#3F3F46', marginLeft: 12 },
  
  creatorCard: { 
    flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: '#F9FAFB', 
    padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: "#000", shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1
  },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: '#E5E7EB' },
  creatorName: { fontWeight: 'bold', fontSize: 16, color: '#1F2937' },
  creatorFollowers: { color: '#71717A', fontSize: 12, marginTop: 2 },
  creatorCategory: { color: '#9333EA', fontSize: 11, marginTop: 4, fontWeight: '500' },
  
  // BOUTONS SUIVRE AVEC GRADIENT
  followBtnWrapper: {},
  followBtn: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4
  },
  followBtnText: { 
    color: '#FFF', 
    fontWeight: 'bold', 
    fontSize: 13 
  },
  followBtnLarge: {
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6
  },
  followBtnLargeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16
  },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  filterOption: { 
    flexDirection: 'row', alignItems: 'center', padding: 15, 
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6', borderRadius: 12 
  },
  filterLabel: { flex: 1, marginLeft: 15, fontSize: 16, color: '#1F2937' },
  
  videoModalContainer: { flex: 1, backgroundColor: '#000' },
  closeBtn: { 
    position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, right: 20, zIndex: 100, 
    padding: 10, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 25,
    width: 50, height: 50, justifyContent: 'center', alignItems: 'center'
  },
  videoPlayerContainer: { width: width, height: 300, backgroundColor: '#000' },
  videoPlayer: { width: '100%', height: '100%', backgroundColor: '#000' },
  videoDetailsScroll: { flex: 1, backgroundColor: '#FFF' },
  videoDetails: { padding: 20, backgroundColor: '#FFF' },
  videoModalTitle: { color: '#1F2937', fontSize: 22, fontWeight: 'bold', lineHeight: 28 },
  videoModalCreator: { color: '#6B7280', fontSize: 16, fontWeight: '600' },
  videoModalDesc: { color: '#4B5563', marginTop: 15, lineHeight: 22, fontSize: 15 },
  
  tagBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F3E8FF', marginRight: 8 },
  tagText: { fontSize: 11, fontWeight: '600', color: '#9333EA' },
  
  divider: { width: '100%', height: 1, backgroundColor: '#E5E7EB', marginVertical: 20 }
});