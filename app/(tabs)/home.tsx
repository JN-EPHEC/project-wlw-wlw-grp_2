import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Dimensions, FlatList, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useRouter } from "expo-router";
import { getAuth, signOut } from "firebase/auth";

export type TabMenuParamList = {
  Home:undefined;
  Explore:undefined;
  Notifications:undefined;
  Profile:undefined;
}

const Tab = createBottomTabNavigator<TabMenuParamList>();
const { width, height } = Dimensions.get('window');

// Interface pour typer les données du feed
interface FeedItem {
  id: string;
  username: string;
  time: string;
  title: string;
  description: string;
  likes: string;
  comments: string;
  image: string;
  avatar: string;
  hashtag: string;
  progress: number;
}

// Données exemple du feed
const FEED_DATA: FeedItem[] = [
  {
    id: '1',
    username: '@SophieMartin',
    time: '1:28',
    title: '5 STRATEGIE DE MARKETING DIGITAL POUR 2025',
    description: 'Découvrez les meilleures stratégies de marketing digitales...',
    likes: '4445',
    comments: '34',
    image: 'https://via.placeholder.com/350x600',
    avatar: 'https://via.placeholder.com/60',
    hashtag: '#MarketingDigital',
    progress: 40,
  },
  {
    id: '2',
    username: '@JeanDupont',
    time: '2:15',
    title: 'TENDANCES WEB DESIGN 2025',
    description: 'Les meilleures tendances du web design...',
    likes: '3200',
    comments: '28',
    image: 'https://via.placeholder.com/350x600',
    avatar: 'https://via.placeholder.com/60',
    hashtag: '#WebDesign',
    progress: 60,
  },
  {
    id: '3',
    username: '@MarieLaurent',
    time: '3:42',
    title: 'GUIDE COMPLET SEO 2025',
    description: 'Optimisez votre référencement naturel...',
    likes: '5100',
    comments: '42',
    image: 'https://via.placeholder.com/350x600',
    avatar: 'https://via.placeholder.com/60',
    hashtag: '#SEO',
    progress: 80,
  },
];

export default function CreatorHomePage() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // --- Auth & navigation pour la déconnexion ---
  const router = useRouter();
  const auth = getAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Redirection vers la page Register
      router.replace("/inscription");
    } catch (error) {
      console.log("Erreur de déconnexion :", error);
      Alert.alert("Erreur", "Impossible de se déconnecter. Réessayez.");
    }
  };

  const renderPost = ({ item }: { item: FeedItem }) => (
    <View style={styles.postContainer}>
      <StatusBar barStyle="light-content" />
      
      {/* En-tête avec heure, bouton déconnexion et icônes */}
      <View style={styles.header}>
        <Text style={styles.headerTime}>9:41</Text>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* Bouton Déconnexion */}
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Icônes système */}
          <View style={styles.headerIcons}>
            <Ionicons name="cellular" size={16} color="#fff" />
            <Ionicons name="wifi" size={16} color="#fff" style={{ marginLeft: 5 }} />
            <Ionicons name="battery-full" size={20} color="#fff" style={{ marginLeft: 5 }} />
          </View>
        </View>
      </View>

      {/* Section principale avec image et fond orange */}
      <View style={styles.heroSection}>
        {/* Fond orange à droite */}
        <View style={styles.orangeBackground} />
        
        {/* Photo du créateur */}
        <View style={styles.creatorImageWrapper}>
          <Image
            source={{ uri: item.image }}
            style={styles.creatorImage}
            resizeMode="cover"
          />
        </View>

        {/* Actions à droite */}
        <View style={styles.rightActions}>
          {/* Mini photo de profil */}
          <View style={styles.miniProfileContainer}>
            <Image
              source={{ uri: item.avatar }}
              style={styles.miniProfile}
            />
          </View>

          {/* Likes */}
          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionIconCircle}>
              <Ionicons name="heart" size={30} color="#fff" />
            </View>
            <Text style={styles.actionText}>{item.likes}</Text>
          </TouchableOpacity>

          {/* Commentaires */}
          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionIconCircle}>
              <Ionicons name="chatbubble-ellipses" size={26} color="#fff" />
            </View>
            <Text style={styles.actionText}>{item.comments}</Text>
          </TouchableOpacity>

          {/* Partager */}
          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionIconCircle}>
              <Ionicons name="arrow-redo" size={26} color="#fff" />
            </View>
            <Text style={styles.actionText}>Partager</Text>
          </TouchableOpacity>

          {/* Badge diplôme orange */}
          <View style={styles.diplomaBadge}>
            <Ionicons name="ribbon" size={28} color="#fff" />
          </View>
        </View>
      </View>

      {/* Section info avec fond noir */}
      <View style={styles.infoSection}>
        <Text style={styles.username}>{item.username} · {item.time}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>
          {item.description} <Text style={styles.seeMore}>voir plus</Text>
        </Text>
        <Text style={styles.hashtag}>{item.hashtag}</Text>
      </View>

      {/* Barre de progression vidéo */}
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
        data={FEED_DATA}
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
    overflow: 'hidden',
    marginBottom: 20,
  },
  miniProfile: {
    width: '100%',
    height: '100%',
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
