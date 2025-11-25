import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Dimensions, FlatList, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

interface FeedItem {
  id: string;
  username: string;
  time: string;
  title: string;
  description: string;
  likes: number;
  comments: number;
  image: string;
  avatar: string;
  hashtag: string;
  progress: number;
  isLiked: boolean;
  isFollowing: boolean;
}

const INITIAL_FEED_DATA: FeedItem[] = [
  {
    id: '1',
    username: '@SophieMartin',
    time: '1:28',
    title: '5 STRATEGIE DE MARKETING DIGITAL POUR 2025',
    description: 'Découvrez les meilleures stratégies de marketing digitales...',
    likes: 4445,
    comments: 34,
    image: 'https://via.placeholder.com/350x600',
    avatar: 'https://via.placeholder.com/60',
    hashtag: '#MarketingDigital',
    progress: 40,
    isLiked: false,
    isFollowing: false,
  },
  {
    id: '2',
    username: '@JeanDupont',
    time: '2:15',
    title: 'TENDANCES WEB DESIGN 2025',
    description: 'Les meilleures tendances du web design...',
    likes: 3200,
    comments: 28,
    image: 'https://via.placeholder.com/350x600',
    avatar: 'https://via.placeholder.com/60',
    hashtag: '#WebDesign',
    progress: 60,
    isLiked: false,
    isFollowing: false,
  },
  {
    id: '3',
    username: '@MarieLaurent',
    time: '3:42',
    title: 'GUIDE COMPLET SEO 2025',
    description: 'Optimisez votre référencement naturel...',
    likes: 5100,
    comments: 42,
    image: 'https://via.placeholder.com/350x600',
    avatar: 'https://via.placeholder.com/60',
    hashtag: '#SEO',
    progress: 80,
    isLiked: false,
    isFollowing: false,
  },
];

export default function CreatorHomePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedData, setFeedData] = useState(INITIAL_FEED_DATA);
  const [activeTab, setActiveTab] = useState('home');

  // Toggle like
  const handleLike = (itemId: string) => {
    setFeedData(prevData =>
      prevData.map(item =>
        item.id === itemId
          ? {
              ...item,
              isLiked: !item.isLiked,
              likes: item.isLiked ? item.likes - 1 : item.likes + 1,
            }
          : item
      )
    );
  };

  // Gérer les commentaires
  const handleComment = (username: string) => {
    Alert.alert('Commentaires', `Ouvrir les commentaires de ${username}`);
  };

  // Gérer le partage
  const handleShare = (title: string) => {
    Alert.alert('Partager', `Partager: ${title}`);
  };

  // Gérer le profil
  const handleProfile = (username: string) => {
    Alert.alert('Profil', `Voir le profil de ${username}`);
  };

  // Toggle follow
  const handleFollow = (itemId: string) => {
    setFeedData(prevData =>
      prevData.map(item =>
        item.id === itemId
          ? { ...item, isFollowing: !item.isFollowing }
          : item
      )
    );
  };

  // Gérer le hashtag
  const handleHashtag = (hashtag: string) => {
    Alert.alert('Recherche', `Rechercher ${hashtag}`);
  };

  // Gérer la vidéo
  const handleVideoPress = (title: string) => {
    Alert.alert('Vidéo', `Lecture: ${title}`);
  };

  // Navigation
  const handleNavigation = (tab: string) => {
    setActiveTab(tab);
    
    switch(tab) {
      case 'home':
        Alert.alert('Navigation', 'Page Accueil');
        break;
      case 'explore':
        Alert.alert('Navigation', 'Page Explorer');
        break;
      case 'add':
        Alert.alert('Créer', 'Créer un nouveau post');
        break;
      case 'notifications':
        Alert.alert('Navigation', 'Page Notifications');
        break;
      case 'profile':
        Alert.alert('Navigation', 'Page Profil');
        break;
    }
  };

  const renderPost = ({ item }: { item: FeedItem }) => (
    <View style={styles.postContainer}>
      <StatusBar barStyle="light-content" />
      
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.headerTime}>9:41</Text>
        <View style={styles.headerIcons}>
          <Ionicons name="cellular" size={16} color="#fff" />
          <Ionicons name="wifi" size={16} color="#fff" style={{ marginLeft: 5 }} />
          <Ionicons name="battery-full" size={20} color="#fff" style={{ marginLeft: 5 }} />
        </View>
      </View>

      {/* Section principale */}
      <TouchableOpacity 
        style={styles.heroSection}
        activeOpacity={0.9}
        onPress={() => handleVideoPress(item.title)}
      >
        <View style={styles.orangeBackground} />
        
        <View style={styles.creatorImageWrapper}>
          <Image
            source={{ uri: item.image }}
            style={styles.creatorImage}
            resizeMode="cover"
          />
        </View>

        {/* Actions à droite */}
        <View style={styles.rightActions}>
          {/* Mini photo de profil - cliquable */}
          <TouchableOpacity 
            style={styles.miniProfileContainer}
            onPress={() => handleProfile(item.username)}
          >
            <Image
              source={{ uri: item.avatar }}
              style={styles.miniProfile}
            />
            {!item.isFollowing && (
              <TouchableOpacity 
                style={styles.followButton}
                onPress={() => handleFollow(item.id)}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Likes - cliquable */}
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => handleLike(item.id)}
          >
            <View style={styles.actionIconCircle}>
              <Ionicons 
                name={item.isLiked ? "heart" : "heart-outline"} 
                size={30} 
                color={item.isLiked ? "#FF3B5C" : "#fff"} 
              />
            </View>
            <Text style={styles.actionText}>{item.likes}</Text>
          </TouchableOpacity>

          {/* Commentaires - cliquable */}
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => handleComment(item.username)}
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="chatbubble-ellipses" size={26} color="#fff" />
            </View>
            <Text style={styles.actionText}>{item.comments}</Text>
          </TouchableOpacity>

          {/* Partager - cliquable */}
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => handleShare(item.title)}
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="arrow-redo" size={26} color="#fff" />
            </View>
            <Text style={styles.actionText}>Partager</Text>
          </TouchableOpacity>

          {/* Badge diplôme */}
          <TouchableOpacity style={styles.diplomaBadge}>
            <Ionicons name="ribbon" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Section info */}
      <View style={styles.infoSection}>
        <TouchableOpacity onPress={() => handleProfile(item.username)}>
          <Text style={styles.username}>{item.username} · {item.time}</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>{item.title}</Text>
        
        <Text style={styles.description}>
          {item.description} <Text style={styles.seeMore}>voir plus</Text>
        </Text>
        
        <TouchableOpacity onPress={() => handleHashtag(item.hashtag)}>
          <Text style={styles.hashtag}>{item.hashtag}</Text>
        </TouchableOpacity>
      </View>

      {/* Barre de progression */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFilled, { width: `${item.progress}%` }]} />
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={feedData}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        pagingEnabled
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const contentOffsetY = event.nativeEvent.contentOffset.y;
          const currentPage = Math.round(contentOffsetY / height);
          setCurrentIndex(currentPage);
        }}
      />

      {/* Navigation en bas */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => handleNavigation('home')}
        >
          <Ionicons 
            name={activeTab === 'home' ? "home" : "home-outline"} 
            size={28} 
            color={activeTab === 'home' ? '#6A4EFB' : '#B0B0B0'} 
          />
          <Text style={[styles.navText, activeTab === 'home' && { color: '#6A4EFB' }]}>
            Accueil
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => handleNavigation('explore')}
        >
          <Ionicons 
            name={activeTab === 'explore' ? "search" : "search-outline"} 
            size={28} 
            color={activeTab === 'explore' ? '#6A4EFB' : '#B0B0B0'} 
          />
          <Text style={[styles.navText, activeTab === 'explore' && { color: '#6A4EFB' }]}>
            Explorer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItemCenter}
          onPress={() => handleNavigation('add')}
        >
          <View style={styles.addButton}>
            <Ionicons name="add" size={32} color="#FD9A34" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => handleNavigation('notifications')}
        >
          <Ionicons 
            name={activeTab === 'notifications' ? "chatbox" : "chatbox-outline"} 
            size={26} 
            color={activeTab === 'notifications' ? '#6A4EFB' : '#B0B0B0'} 
          />
          <Text style={[styles.navText, activeTab === 'notifications' && { color: '#6A4EFB' }]}>
            Notifications
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => handleNavigation('profile')}
        >
          <Ionicons 
            name={activeTab === 'profile' ? "person" : "person-outline"} 
            size={28} 
            color={activeTab === 'profile' ? '#6A4EFB' : '#B0B0B0'} 
          />
          <Text style={[styles.navText, activeTab === 'profile' && { color: '#6A4EFB' }]}>
            Profil
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F6',
  },
  postContainer: {
    height: height,
    backgroundColor: '#F8F8F6',
  },
  header: {
    height: 44,
    backgroundColor: '#FD9A34',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTime: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroSection: {
    height: height * 0.6,
    position: 'relative',
    backgroundColor: '#F8F8F6',
  },
  orangeBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '45%',
    height: '100%',
    backgroundColor: '#FD9A34',
    borderBottomLeftRadius: 200,
  },
  creatorImageWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '70%',
    height: '100%',
  },
  creatorImage: {
    width: '100%',
    height: '100%',
  },
  rightActions: {
    position: 'absolute',
    right: 15,
    bottom: 20,
    alignItems: 'center',
  },
  miniProfileContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'visible',
    marginBottom: 20,
    position: 'relative',
  },
  miniProfile: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  followButton: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6A4EFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  actionItem: {
    alignItems: 'center',
    marginBottom: 18,
  },
  actionIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  diplomaBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FD9A34',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    marginTop: 10,
  },
  infoSection: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
    flex: 1,
  },
  username: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 20,
  },
  description: {
    color: '#fff',
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  seeMore: {
    color: '#B0B0B0',
  },
  hashtag: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  progressBarContainer: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFilled: {
    height: '100%',
    backgroundColor: '#6A4EFB',
    borderRadius: 2,
  },
  bottomNav: {
    height: 70,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingBottom: 5,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navItemCenter: {
    alignItems: 'center',
    flex: 1,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FD9A34',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  navText: {
    fontSize: 11,
    color: '#B0B0B0',
    marginTop: 4,
    fontWeight: '500',
  },
});