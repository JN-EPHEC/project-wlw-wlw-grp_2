import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
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
};

// Types
interface Message {
  id: string;
  text?: string;
  imageUrl?: string;
  timestamp: string;
  senderId: string;
  senderName: string;
  isCurrentUser: boolean;
}

interface ConversationInfo {
  id: string;
  name: string;
  avatar: string;
  isCreator: boolean;
}

// 🎭 Base de données mockée de toutes les conversations
const ALL_CONVERSATIONS: Record<string, ConversationInfo> = {
  '1': {
    id: '1',
    name: 'Amara Diallo',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
    isCreator: true,
  },
  '2': {
    id: '2',
    name: 'Léo Mercier',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
    isCreator: false,
  },
  '3': {
    id: '3',
    name: 'Yasmine Benali',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop',
    isCreator: true,
  },
  '4': {
    id: '4',
    name: 'Malik Traoré',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop',
    isCreator: false,
  },
  '5': {
    id: '5',
    name: 'Inès Rousseau',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
    isCreator: true,
  },
};

// Messages différents pour chaque conversation
const ALL_MESSAGES: Record<string, Message[]> = {
  '1': [
    {
      id: '1',
      text: 'Bonjour Amara ! J\'ai regardé votre nouvelle vidéo sur React Native',
      timestamp: '2024-01-20T14:00:00',
      senderId: 'currentUser',
      senderName: 'Toi',
      isCurrentUser: true,
    },
    {
      id: '2',
      text: 'Salut ! Merci beaucoup, qu\'est-ce que tu en as pensé ? 😊',
      timestamp: '2024-01-20T14:02:00',
      senderId: 'user1',
      senderName: 'Amara Diallo',
      isCurrentUser: false,
    },
    {
      id: '3',
      text: 'C\'était super clair ! Par contre j\'ai une question sur les hooks',
      timestamp: '2024-01-20T14:03:00',
      senderId: 'currentUser',
      senderName: 'Toi',
      isCurrentUser: true,
    },
  ],
  '2': [
    {
      id: '1',
      text: 'Salut Léo ! Tu as réussi l\'exercice 3 ?',
      timestamp: '2024-01-20T15:00:00',
      senderId: 'currentUser',
      senderName: 'Toi',
      isCurrentUser: true,
    },
    {
      id: '2',
      text: 'Hey ! Oui j\'ai fini hier soir. C\'était chaud 😅',
      timestamp: '2024-01-20T15:05:00',
      senderId: 'user2',
      senderName: 'Léo Mercier',
      isCurrentUser: false,
    },
    {
      id: '3',
      text: 'Tu peux m\'expliquer comment tu as fait pour la partie async/await ?',
      timestamp: '2024-01-20T15:06:00',
      senderId: 'currentUser',
      senderName: 'Toi',
      isCurrentUser: true,
    },
  ],
  '3': [
    {
      id: '1',
      text: 'Yasmine, merci pour votre cours sur TypeScript !',
      timestamp: '2024-01-19T10:00:00',
      senderId: 'currentUser',
      senderName: 'Toi',
      isCurrentUser: true,
    },
    {
      id: '2',
      text: 'Avec plaisir ! Tu as des questions ? 🤓',
      timestamp: '2024-01-19T10:15:00',
      senderId: 'user3',
      senderName: 'Yasmine Benali',
      isCurrentUser: false,
    },
  ],
};

export default function ConversationPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  // Récupérer les infos selon l'ID
  const conversationInfo = ALL_CONVERSATIONS[id || '1'] || ALL_CONVERSATIONS['1'];
  const initialMessages = ALL_MESSAGES[id || '1'] || ALL_MESSAGES['1'];
  
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleSend = () => {
    if (inputText.trim() === '') return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      timestamp: new Date().toISOString(),
      senderId: 'currentUser',
      senderName: 'Toi',
      isCurrentUser: true,
    };

    setMessages([...messages, newMessage]);
    setInputText('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // 🎯 Fonction pour les emojis
  const handleEmojiPress = () => {
    Alert.alert('Emojis', 'Sélectionneur d\'emojis (à implémenter avec Firebase plus tard)');
  };

  // 🎯 Fonction pour joindre un fichier
  const handleAttachFile = () => {
    Alert.alert('Fichier', 'Sélection de fichier (à implémenter avec Firebase Storage)');
  };

  // 🎯 Fonction pour prendre/choisir une photo
  const handleTakePhoto = () => {
    Alert.alert(
      'Photo',
      'Que voulez-vous faire ?',
      [
        {
          text: 'Prendre une photo',
          onPress: () => console.log('Ouvrir caméra - à implémenter'),
        },
        {
          text: 'Choisir depuis galerie',
          onPress: () => console.log('Ouvrir galerie - à implémenter'),
        },
        {
          text: 'Annuler',
          style: 'cancel',
        },
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ThemedText style={styles.backIcon}>←</ThemedText>
      </Pressable>

      <View style={styles.headerCenter}>
        <Image source={{ uri: conversationInfo.avatar }} style={styles.headerAvatar} />
        <View>
          <ThemedText style={styles.headerName}>{conversationInfo.name}</ThemedText>
          {conversationInfo.isCreator && (
            <ThemedText style={styles.headerRole}>Créateur</ThemedText>
          )}
        </View>
      </View>

      <View style={styles.headerActions}>
        <Pressable style={styles.headerIconButton}>
          <ThemedText style={styles.headerIcon}>📞</ThemedText>
        </Pressable>
        <Pressable style={styles.headerIconButton}>
          <ThemedText style={styles.headerIcon}>⋮</ThemedText>
        </Pressable>
      </View>
    </View>
  );

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.isCurrentUser;

    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.messageContainerRight : styles.messageContainerLeft,
        ]}
      >
        {!isCurrentUser && (
          <Image
            source={{ uri: conversationInfo.avatar }}
            style={styles.messageAvatar}
          />
        )}

        <View style={styles.messageContent}>
          <View
            style={[
              styles.messageBubble,
              isCurrentUser ? styles.messageBubbleOrange : styles.messageBubbleViolet,
            ]}
          >
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            ) : (
              <ThemedText style={styles.messageText}>{item.text}</ThemedText>
            )}
          </View>

          <ThemedText
            style={[
              styles.messageTime,
              isCurrentUser ? styles.messageTimeRight : styles.messageTimeLeft,
            ]}
          >
            {formatTime(item.timestamp)}
          </ThemedText>
        </View>
      </View>
    );
  };

  const renderInput = () => (
    <View style={styles.inputContainer}>
      {/* Bouton Emoji - CLIQUABLE */}
      <Pressable style={styles.emojiButton} onPress={handleEmojiPress}>
        <ThemedText style={styles.emojiIcon}>😊</ThemedText>
      </Pressable>

      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Écrivez un message..."
          placeholderTextColor={COLORS.gris}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />

        <View style={styles.inputActions}>
          {/* Bouton Fichier - CLIQUABLE */}
          <Pressable style={styles.inputIconButton} onPress={handleAttachFile}>
            <ThemedText style={styles.inputIcon}>📎</ThemedText>
          </Pressable>
          
          {/* Bouton Photo - CLIQUABLE */}
          <Pressable style={styles.inputIconButton} onPress={handleTakePhoto}>
            <ThemedText style={styles.inputIcon}>📷</ThemedText>
          </Pressable>
        </View>
      </View>

      <Pressable
        style={[
          styles.sendButton,
          inputText.trim() === '' && styles.sendButtonDisabled,
        ]}
        onPress={handleSend}
        disabled={inputText.trim() === ''}
      >
        <ThemedText style={styles.sendIcon}>➤</ThemedText>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ThemedView style={styles.container}>
        {renderHeader()}

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          {renderInput()}
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.blanc,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grisClair,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.bleuNuit,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.bleuNuit,
    fontFamily: 'Poppins',
  },
  headerRole: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.violetPrincipal,
    fontFamily: 'Poppins',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 20,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  messageContainerLeft: {
    justifyContent: 'flex-start',
  },
  messageContainerRight: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageContent: {
    maxWidth: '75%',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 4,
  },
  messageBubbleViolet: {
    backgroundColor: COLORS.violetPrincipal,
    borderBottomLeftRadius: 4,
  },
  messageBubbleOrange: {
    backgroundColor: COLORS.orangeSecondaire,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.blanc,
    lineHeight: 20,
    fontFamily: 'Poppins',
  },
  messageImage: {
    width: 250,
    height: 180,
    borderRadius: 12,
  },
  messageTime: {
    fontSize: 11,
    fontWeight: '400',
    color: COLORS.gris,
    fontFamily: 'Poppins',
  },
  messageTimeLeft: {
    textAlign: 'left',
    marginLeft: 4,
  },
  messageTimeRight: {
    textAlign: 'right',
    marginRight: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.blanc,
    borderTopWidth: 1,
    borderTopColor: COLORS.grisClair,
    gap: 8,
  },
  emojiButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emojiIcon: {
    fontSize: 24,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.blancCasse,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 40,
    maxHeight: 100,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.bleuNuit,
    fontFamily: 'Poppins',
    paddingTop: 6,
    paddingBottom: 6,
  },
  inputActions: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 8,
  },
  inputIconButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputIcon: {
    fontSize: 18,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.violetPrincipal,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.grisClair,
    opacity: 0.5,
  },
  sendIcon: {
    fontSize: 18,
    color: COLORS.blanc,
  },
});