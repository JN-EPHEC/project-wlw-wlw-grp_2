import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
const COLORS = {
  violetPrincipal: '#7459F0',
  orangeSecondaire: '#FBA31A',
  bleuNuit: '#242A65',
  blancCasse: '#F8F8F6',
  gris: '#6B7280',
  grisClair: '#E5E7EB',
  blanc: '#FFFFFF',
  vert: '#10B981',
};

// Types
type ConversationType = 'user_to_user' | 'creator_to_user';

interface Conversation {
  id: string;
  userName: string;
  userAvatar: string; // URL Unsplash
  userRole: 'creator' | 'user';
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  unreadCount?: number;
  type: ConversationType;
  hasImage?: boolean;
  verified?: boolean; // Créateur vérifié
}

// 🎭 Conversations réalistes avec photos Unsplash
const INITIAL_CONVERSATIONS: Conversation[] = [
  // 1. Créateur → Utilisateur (nouvelle vidéo)
  {
    id: '1',
    userName: 'Amara Diallo',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
    userRole: 'creator',
    lastMessage: 'Nouvelle vidéo disponible : "Les bases de React Native" 🎥',
    timestamp: '2024-01-20T16:30:00',
    unread: true,
    unreadCount: 1,
    type: 'creator_to_user',
    verified: true,
  },
  
  // 2. Utilisateur ↔ Utilisateur (entraide)
  {
    id: '2',
    userName: 'Léo Mercier',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
    userRole: 'user',
    lastMessage: 'Tu as réussi l\'exercice 3 ? Je bloque sur la partie async/await',
    timestamp: '2024-01-20T14:15:00',
    unread: true,
    unreadCount: 2,
    type: 'user_to_user',
  },
  
  // 3. Créateur → Utilisateur (réponse à question)
  {
    id: '3',
    userName: 'Yasmine Benali',
    userAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop',
    userRole: 'creator',
    lastMessage: 'Excellente question ! Pour utiliser map(), tu dois retourner un élément...',
    timestamp: '2024-01-20T11:30:00',
    unread: false,
    type: 'creator_to_user',
    verified: true,
  },
  
  // 4. Utilisateur ↔ Utilisateur (partage de ressources)
  {
    id: '4',
    userName: 'Malik Traoré',
    userAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop',
    userRole: 'user',
    lastMessage: 'J\'ai trouvé un super article sur les hooks, je te l\'envoie !',
    timestamp: '2024-01-19T18:45:00',
    unread: false,
    type: 'user_to_user',
    hasImage: true,
  },
  
  // 5. Créateur → Utilisateur (feedback sur projet)
  {
    id: '5',
    userName: 'Inès Rousseau',
    userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
    userRole: 'creator',
    lastMessage: 'J\'ai regardé ton projet, c\'est vraiment bien ! Quelques suggestions...',
    timestamp: '2024-01-19T15:20:00',
    unread: true,
    unreadCount: 1,
    type: 'creator_to_user',
    verified: true,
  },
  
  // 6. Utilisateur ↔ Utilisateur (organisation étude)
  {
    id: '6',
    userName: 'Sofia Martinez',
    userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop',
    userRole: 'user',
    lastMessage: 'On se fait une session de code ensemble demain soir ?',
    timestamp: '2024-01-19T12:10:00',
    unread: false,
    type: 'user_to_user',
  },
  
  // 7. Créateur → Utilisateur (annonce live)
  {
    id: '7',
    userName: 'Karim Dubois',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
    userRole: 'creator',
    lastMessage: '🔴 LIVE demain 19h : On code une app de A à Z en direct !',
    timestamp: '2024-01-19T09:00:00',
    unread: true,
    unreadCount: 1,
    type: 'creator_to_user',
    verified: true,
  },
  
  // 8. Utilisateur ↔ Utilisateur (demande d'aide)
  {
    id: '8',
    userName: 'Noah Laurent',
    userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
    userRole: 'user',
    lastMessage: 'Salut ! Tu peux m\'expliquer comment tu as fait pour déployer ton app ?',
    timestamp: '2024-01-18T20:15:00',
    unread: false,
    type: 'user_to_user',
  },
  
  // 9. Créateur → Utilisateur (message de motivation)
  {
    id: '9',
    userName: 'Emma Kowalski',
    userAvatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop',
    userRole: 'creator',
    lastMessage: 'Continue comme ça, tu fais d\'énormes progrès ! 💪',
    timestamp: '2024-01-18T16:40:00',
    unread: false,
    type: 'creator_to_user',
    verified: true,
  },
  
  // 10. Utilisateur ↔ Utilisateur (partage de succès)
  {
    id: '10',
    userName: 'Liam Nguyen',
    userAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop',
    userRole: 'user',
    lastMessage: 'Devine quoi ? J\'ai décroché mon premier stage en tant que dev ! 🎉',
    timestamp: '2024-01-18T11:25:00',
    unread: false,
    type: 'user_to_user',
  },
  
  // 11. Créateur → Utilisateur (correction exercice)
  {
    id: '11',
    userName: 'Zara Patel',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop',
    userRole: 'creator',
    lastMessage: 'Ton code est presque parfait ! Juste une petite modification à faire...',
    timestamp: '2024-01-17T14:50:00',
    unread: false,
    type: 'creator_to_user',
    verified: true,
  },
  
  // 12. Utilisateur ↔ Utilisateur (question technique)
  {
    id: '12',
    userName: 'Adam Bernard',
    userAvatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&h=150&fit=crop',
    userRole: 'user',
    lastMessage: 'Tu utilises quel framework pour le backend ? Node.js ou Django ?',
    timestamp: '2024-01-17T09:30:00',
    unread: false,
    type: 'user_to_user',
  },
];

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter((conv) =>
    conv.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadCount = conversations.filter(c => c.unread).length;
  const hasUnread = unreadCount > 0;

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "À l'instant";
    if (diffInHours < 24) return `Il y a ${Math.floor(diffInHours)}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Hier';
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const handleConversationPress = (conversation: Conversation) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversation.id ? { ...conv, unread: false, unreadCount: 0 } : conv
      )
    );
    router.push(`/conversation/${conversation.id}`);
    console.log('Ouvrir conversation avec:', conversation.userName);
  };

  const handleNewMessage = () => {
    console.log('Nouveau message');
  };

  // Render du header
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ThemedText style={styles.backIcon}>←</ThemedText>
        </Pressable>

        <ThemedText style={styles.headerTitle}>Discussions</ThemedText>

        <Pressable style={styles.composeButton} onPress={handleNewMessage}>
          <ThemedText style={styles.composeIcon}>✏️</ThemedText>
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <ThemedText style={styles.searchIcon}>🔍</ThemedText>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une conversation..."
          placeholderTextColor={COLORS.gris}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <ThemedText style={styles.clearIcon}>✕</ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );

  // Render d'une conversation
  const renderConversation = ({ item }: { item: Conversation }) => {
    return (
      <Pressable
        style={[
          styles.conversationCard,
          item.unread && styles.conversationCardUnread,
        ]}
        onPress={() => handleConversationPress(item)}
      >
        {/* Avatar avec photo Unsplash */}
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: item.userAvatar }} 
            style={styles.avatar}
          />
          
          {/* Badge vérifié pour créateurs */}
          {item.verified && (
            <View style={styles.verifiedBadge}>
              <ThemedText style={styles.verifiedIcon}>✓</ThemedText>
            </View>
          )}
          
          {/* Point non lu */}
          {item.unread && (
            <View style={styles.unreadDot} />
          )}
        </View>

        {/* Contenu */}
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <View style={styles.nameContainer}>
              <ThemedText
                style={[
                  styles.userName,
                  item.unread && styles.userNameUnread,
                ]}
                numberOfLines={1}
              >
                {item.userName}
              </ThemedText>
              
              {/* Badge Créateur */}
              {item.userRole === 'creator' && (
                <View style={styles.creatorBadge}>
                  <ThemedText style={styles.creatorBadgeText}>Créateur</ThemedText>
                </View>
              )}
            </View>

            <ThemedText style={styles.timestamp}>
              {formatTimestamp(item.timestamp)}
            </ThemedText>
          </View>

          <View style={styles.messageFooter}>
            <ThemedText
              style={[
                styles.lastMessage,
                item.unread && styles.lastMessageUnread,
              ]}
              numberOfLines={2}
            >
              {item.hasImage && '📸 '}
              {item.lastMessage}
            </ThemedText>

            {item.unreadCount && item.unreadCount > 0 && (
              <View style={styles.countBadge}>
                <ThemedText style={styles.countBadgeText}>
                  {item.unreadCount}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const renderAllCaughtUp = () => (
    <View style={styles.caughtUpContainer}>
      <ThemedText style={styles.caughtUpIcon}>✨</ThemedText>
      <ThemedText style={styles.caughtUpText}>Vous êtes à jour !</ThemedText>
      <ThemedText style={styles.caughtUpSubtext}>
        Aucun nouveau message
      </ThemedText>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ThemedText style={styles.emptyIcon}>💬</ThemedText>
      <ThemedText style={styles.emptyText}>Aucune discussion</ThemedText>
      <ThemedText style={styles.emptySubtext}>
        Vos conversations apparaîtront ici
      </ThemedText>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ThemedView style={styles.container}>
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={!hasUnread && conversations.length > 0 ? renderAllCaughtUp : null}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.blanc,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.blancCasse,
  },
  listContent: {
    paddingBottom: 32,
  },
  headerContainer: {
    backgroundColor: COLORS.blanc,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grisClair,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.blancCasse,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.bleuNuit,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.bleuNuit,
    fontFamily: 'Poppins',
  },
  composeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.violetPrincipal,
  },
  composeIcon: {
    fontSize: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.blancCasse,
    borderRadius: 12,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
    opacity: 0.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.bleuNuit,
    fontFamily: 'Poppins',
  },
  clearIcon: {
    fontSize: 16,
    color: COLORS.gris,
    padding: 4,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.grisClair,
    marginLeft: 76,
  },
  conversationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.blanc,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  conversationCardUnread: {
    backgroundColor: '#F5F1FF',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.violetPrincipal,
    borderWidth: 2,
    borderColor: COLORS.blanc,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedIcon: {
    color: COLORS.blanc,
    fontSize: 10,
    fontWeight: 'bold',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.violetPrincipal,
    borderWidth: 2,
    borderColor: COLORS.blanc,
  },
  conversationContent: {
    flex: 1,
    gap: 4,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.bleuNuit,
    fontFamily: 'Poppins',
  },
  userNameUnread: {
    fontWeight: '700',
  },
  creatorBadge: {
    backgroundColor: COLORS.violetPrincipal,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  creatorBadgeText: {
    color: COLORS.blanc,
    fontSize: 9,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.gris,
    fontFamily: 'Poppins',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 2,
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.gris,
    lineHeight: 20,
    fontFamily: 'Poppins',
  },
  lastMessageUnread: {
    fontWeight: '500',
    color: COLORS.bleuNuit,
  },
  countBadge: {
    backgroundColor: COLORS.violetPrincipal,
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    color: COLORS.blanc,
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
  },
  caughtUpContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  caughtUpIcon: {
    fontSize: 48,
  },
  caughtUpText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.bleuNuit,
    fontFamily: 'Poppins',
  },
  caughtUpSubtext: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.gris,
    fontFamily: 'Poppins',
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    fontSize: 64,
    opacity: 0.3,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.gris,
    fontFamily: 'Poppins',
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.gris,
    fontFamily: 'Poppins',
  },
});