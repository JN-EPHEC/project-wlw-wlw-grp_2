import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert, Modal, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

// Base de données des utilisateurs
const USERS_DATABASE: Record<string, { id: string; name: string; avatar: string; status: string }> = {
  '1': {
    id: '1',
    name: 'Marie Dupont',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    status: 'En ligne'
  },
  '2': {
    id: '2',
    name: 'Thomas Bernard',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    status: 'En ligne'
  },
  '3': {
    id: '3',
    name: 'Lucas Noel',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150',
    status: 'Hors ligne'
  },
  '4': {
    id: '4',
    name: 'Sophie Martin',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    status: 'En ligne'
  },
  '5': {
    id: '5',
    name: 'Ahmed Khalil',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    status: 'Hors ligne'
  },
  '6': {
    id: '6',
    name: 'Emma Wilson',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    status: 'En ligne'
  },
  '7': {
    id: '7',
    name: 'Kevin Dubois',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    status: 'Hors ligne'
  },
};

interface Message {
  id: string;
  text: string;
  isMine: boolean;
  time: string;
}

// Messages initiaux pour chaque conversation
const INITIAL_MESSAGES: Record<string, Message[]> = {
  '1': [
    { id: '1', text: "Salut ! J'ai adoré ta dernière vidéo", isMine: false, time: 'Il y a 2h' },
    { id: '2', text: "Merci beaucoup ! 😊", isMine: true, time: 'Il y a 1h' },
    { id: '3', text: "Tu peux en faire d'autres sur React Native ?", isMine: false, time: 'Il y a 30min' }
  ],
  '2': [
    { id: '1', text: "Tu as des ressources sur l'IA ?", isMine: false, time: 'Il y a 3h' },
    { id: '2', text: "Oui, je t'envoie ça tout de suite", isMine: true, time: 'Il y a 2h' },
    { id: '3', text: "Regarde ce cours sur Coursera", isMine: true, time: 'Il y a 2h' }
  ],
  '3': [
    { id: '1', text: "Le rendu est pour demain.", isMine: false, time: 'Hier' },
    { id: '2', text: "Oui je sais, j'y travaille", isMine: true, time: 'Hier' },
    { id: '3', text: "Tu veux qu'on se retrouve pour réviser ?", isMine: false, time: 'Hier' }
  ],
  '4': [
    { id: '1', text: "Excellent cours aujourd'hui ! 👏", isMine: false, time: 'Hier' },
    { id: '2', text: "Merci Sophie ! Content que ça t'ait plu", isMine: true, time: 'Hier' },
    { id: '3', text: "La partie sur les hooks était super claire", isMine: false, time: 'Hier' }
  ],
  '5': [
    { id: '1', text: "J'ai une question sur le projet...", isMine: false, time: 'Il y a 2j' },
    { id: '2', text: "Bien sûr, vas-y", isMine: true, time: 'Il y a 2j' },
    { id: '3', text: "Comment tu gères l'authentification ?", isMine: false, time: 'Il y a 2j' }
  ],
  '6': [
    { id: '1', text: "Merci pour ton aide ! 😊", isMine: false, time: 'Il y a 3j' },
    { id: '2', text: "De rien, n'hésite pas", isMine: true, time: 'Il y a 3j' },
    { id: '3', text: "J'ai enfin compris les props !", isMine: false, time: 'Il y a 3j' }
  ],
  '7': [
    { id: '1', text: "À quelle heure la prochaine session ?", isMine: false, time: 'Il y a 4j' },
    { id: '2', text: "14h demain", isMine: true, time: 'Il y a 4j' },
    { id: '3', text: "Ok parfait, merci !", isMine: false, time: 'Il y a 4j' }
  ],
};

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Récupérer l'ID de l'utilisateur depuis les paramètres
  const userId = (params.userId as string) || '1';
  const currentUser = USERS_DATABASE[userId] || USERS_DATABASE['1'];
  
  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>(
    INITIAL_MESSAGES[userId] || INITIAL_MESSAGES['1']
  );

  // Mettre à jour les messages quand l'utilisateur change
  useEffect(() => {
    setChatMessages(INITIAL_MESSAGES[userId] || INITIAL_MESSAGES['1']);
  }, [userId]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    setChatMessages([...chatMessages, { 
      id: Date.now().toString(), 
      text: inputText, 
      isMine: true, 
      time: 'À l\'instant' 
    }]);
    setInputText('');
  };

  const deleteMessage = (id: string) => {
    Alert.alert("Supprimer", "Voulez-vous supprimer ce message ?", [
      { text: "Annuler", style: "cancel" },
      { 
        text: "Supprimer", 
        style: "destructive", 
        onPress: () => setChatMessages(prev => prev.filter(m => m.id !== id)) 
      }
    ]);
  };

  const goToProfile = () => {
    router.back();
    setTimeout(() => {
      router.push('/(tabs-formateur)/profile' as any);
    }, 100);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container} 
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#52525B" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={goToProfile} 
          style={styles.userInfoContainer}
        >
          <Image 
            source={{ uri: currentUser.avatar }} 
            style={styles.avatarSmall} 
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{currentUser.name}</Text>
            <Text style={[
              styles.onlineStatus,
              { color: currentUser.status === 'En ligne' ? '#22C55E' : '#71717A' }
            ]}>
              {currentUser.status}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowMenu(true)}>
          <Ionicons name="ellipsis-vertical" size={20} color="#52525B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.chatContainer}>
        {chatMessages.map((msg) => (
          <TouchableOpacity 
            key={msg.id} 
            onLongPress={() => deleteMessage(msg.id)} 
            style={msg.isMine ? styles.myMsg : styles.theirMsg}
          >
            <Text style={msg.isMine ? styles.myText : styles.theirText}>
              {msg.text}
            </Text>
            <Text style={msg.isMine ? styles.myTime : styles.theirTime}>
              {msg.time}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.inputArea}>
        <TouchableOpacity onPress={async () => await DocumentPicker.getDocumentAsync({})}>
          <Ionicons name="attach" size={26} color="#52525B" />
        </TouchableOpacity>
        <TextInput 
          style={styles.input} 
          placeholder="Écrire un message..." 
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity onPress={handleSendMessage} style={styles.sendBtn}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal transparent visible={showMenu} animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.menuCard}>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => { 
                setShowMenu(false); 
                goToProfile(); 
              }}
            >
              <Ionicons name="person-outline" size={20} color="#9333EA" />
              <Text style={[styles.menuText, { color: '#9333EA' }]}>
                Voir le profil
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => { 
                setShowMenu(false); 
                Alert.alert("Signalé", `Vous avez signalé ${currentUser.name}`); 
              }}
            >
              <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
              <Text style={[styles.menuText, { color: '#EF4444' }]}>
                Signaler l'utilisateur
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingBottom: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6', 
    gap: 12 
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatarSmall: { width: 36, height: 36, borderRadius: 18 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#18181B' },
  onlineStatus: { fontSize: 12 },
  chatContainer: { padding: 16, gap: 12, paddingBottom: 30 },
  theirMsg: { 
    alignSelf: 'flex-start', 
    backgroundColor: '#F4F4F5', 
    padding: 12, 
    borderRadius: 16, 
    borderBottomLeftRadius: 4, 
    maxWidth: '80%' 
  },
  theirText: { color: '#18181B', fontSize: 15 },
  theirTime: { fontSize: 10, color: '#71717A', marginTop: 4 },
  myMsg: { 
    alignSelf: 'flex-end', 
    backgroundColor: '#A855F7', 
    padding: 12, 
    borderRadius: 16, 
    borderBottomRightRadius: 4, 
    maxWidth: '80%' 
  },
  myText: { color: '#FFF', fontSize: 15 },
  myTime: { fontSize: 10, color: '#E9D5FF', marginTop: 4, textAlign: 'right' },
  inputArea: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#F3F4F6', 
    paddingBottom: Platform.OS === 'ios' ? 30 : 12, 
    gap: 10,
    backgroundColor: '#FFF'
  },
  input: { 
    flex: 1, 
    height: 40, 
    backgroundColor: '#F4F4F5', 
    borderRadius: 20, 
    paddingHorizontal: 16,
    fontSize: 15 
  },
  sendBtn: { 
    backgroundColor: '#A855F7', 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  menuCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    width: '80%', 
    padding: 8 
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    gap: 12 
  },
  menuText: { fontSize: 15, fontWeight: '500' }
});