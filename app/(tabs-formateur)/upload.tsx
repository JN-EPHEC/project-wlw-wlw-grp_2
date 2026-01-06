import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, 
  ScrollView, Image, Alert, ActivityIndicator, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

// Firebase Imports
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, doc, updateDoc, increment, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { auth, storage, db } from '../../firebaseConfig';

const CATEGORIES = [
  'Marketing', 'IA', 'E-commerce', 'Design', 'Dev', 'Business', 'Photo', 'Vidéo'
];

export default function UploadScreen() {
  const router = useRouter();

  // --- State ---
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // --- Logic: Pick Video ---
  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0].uri) {
        const uri = result.assets[0].uri;
        setVideoUri(uri);
        generateThumbnail(uri);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner la vidéo');
    }
  };

  const generateThumbnail = async (videoUri: string) => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 1000, // Capture at 1 second
      });
      setThumbnailUri(uri);
    } catch (e) {
      console.warn("Could not generate thumbnail", e);
    }
  };

  const clearSelection = () => {
    setVideoUri(null);
    setThumbnailUri(null);
    setProgress(0);
  };

  // --- Logic: Upload to Firebase ---
  const handleUpload = async () => {
    if (!videoUri || !title || !selectedCategory) {
      Alert.alert('Champs manquants', 'Veuillez sélectionner une vidéo, un titre et une catégorie.');
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setUploading(true);

    try {
      // 1. Upload Video
      const videoBlob = await (await fetch(videoUri)).blob();
      const videoRef = ref(storage, `videos/${user.uid}/${Date.now()}.mp4`);
      const uploadTask = uploadBytesResumable(videoRef, videoBlob);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(Math.round(prog));
        },
        (error) => {
          console.error("Upload error:", error);
          setUploading(false);
          Alert.alert("Erreur", "Échec de l'upload vidéo");
        },
        async () => {
          // Upload complete
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          
          // 2. Upload Thumbnail (if exists)
          let thumbUrl = null;
          if (thumbnailUri) {
            const thumbBlob = await (await fetch(thumbnailUri)).blob();
            const thumbRef = ref(storage, `thumbnails/${user.uid}/${Date.now()}.jpg`);
            await uploadBytesResumable(thumbRef, thumbBlob);
            thumbUrl = await getDownloadURL(thumbRef);
          }

          // 3. Save to Firestore
          await saveToFirestore(user.uid, downloadUrl, thumbUrl);
        }
      );

    } catch (error) {
      console.error(error);
      setUploading(false);
      Alert.alert("Erreur", "Une erreur est survenue");
    }
  };

  const saveToFirestore = async (userId: string, videoUrl: string, thumbnailUrl: string | null) => {
    try {
      // Add Video Document
      const videoDocRef = await addDoc(collection(db, 'videos'), {
        creatorId: userId,
        videoUrl: videoUrl,
        thumbnail: thumbnailUrl,
        title: title,
        description: description,
        category: selectedCategory,
        likes: 0,
        views: 0,
        comments: 0,
        createdAt: serverTimestamp(),
      });

      // Update User Stats
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'stats.videosCreated': increment(1),
        videos: arrayUnion(videoDocRef.id)
      });

      setUploading(false);
      Alert.alert("Succès", "Vidéo publiée avec succès ! 🎉");
      
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedCategory('');
      clearSelection();
      
      // Navigate home
      router.push('/(tabs-formateur)/home');

    } catch (error) {
      console.error("Firestore Error:", error);
      setUploading(false);
      Alert.alert("Erreur", "Impossible de sauvegarder les données.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nouvelle Publication</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Video Picker Area */}
        {videoUri ? (
          <View style={styles.previewContainer}>
            <Image 
              source={{ uri: thumbnailUri || videoUri }} 
              style={styles.thumbnail} 
              resizeMode="cover" 
            />
            <View style={styles.previewOverlay}>
              <TouchableOpacity style={styles.clearBtn} onPress={clearSelection} disabled={uploading}>
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </TouchableOpacity>
              <View style={styles.playIcon}>
                <Ionicons name="play-circle" size={60} color="rgba(255,255,255,0.9)" />
              </View>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadBox} onPress={pickVideo}>
            <LinearGradient
              colors={['#F3E8FF', '#FEFBFF', '#F9FAFB']}
              style={styles.uploadGradient}
            >
              <View style={styles.uploadIconCircle}>
                <Ionicons name="cloud-upload-outline" size={44} color="#7459f0" />
              </View>
              <Text style={styles.uploadText}>Sélectionner une vidéo</Text>
              <Text style={styles.uploadSubText}>Format MP4, max 3 min • Ratio 9:16 recommandé</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Form Fields */}
        <View style={styles.formContainer}>
          <Text style={styles.label}>Titre de la leçon *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Les bases du SEO pour débutants..."
            value={title}
            onChangeText={setTitle}
            maxLength={60}
            editable={!uploading}
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Décrivez le contenu de votre vidéo en quelques mots..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            editable={!uploading}
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>Catégorie *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat && styles.categoryChipSelected
                ]}
                onPress={() => !uploading && setSelectedCategory(cat)}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === cat && styles.categoryTextSelected
                ]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[
            styles.submitButtonContainer,
            (!videoUri || !title || !selectedCategory || uploading) && styles.submitButtonDisabled
          ]}
          onPress={handleUpload}
          disabled={!videoUri || !title || !selectedCategory || uploading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={(!videoUri || !title || !selectedCategory || uploading) 
              ? ['#D1D5DB', '#D1D5DB'] 
              : ['#7459f0', '#9333ea', '#242A65']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitButton}
          >
            {uploading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#FFF" />
                <Text style={styles.submitText}>Upload en cours {progress}%</Text>
              </View>
            ) : (
              <>
                <Ionicons name="cloud-upload" size={22} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitText}>Publier la vidéo</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>

      {/* Loading Overlay with improved progress bar */}
      {uploading && (
        <View style={styles.progressOverlay}>
          <View style={styles.progressBarContainer}>
            <LinearGradient
              colors={['#7459f0', '#9333ea']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${progress}%` }]}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  
  // Upload Box avec Gradient Violet harmonisé
  uploadBox: {
    height: 260,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E9D5FF',
    borderStyle: 'dashed',
  },
  uploadGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#E9D5FF',
  },
  uploadText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  uploadSubText: {
    fontSize: 13,
    color: '#71717A',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  
  // Preview amélioré avec meilleur aspect ratio (9:16 pour vidéos verticales)
  previewContainer: {
    height: 480,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#000',
    position: 'relative',
    borderWidth: 3,
    borderColor: '#7459f0',
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  clearBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  playIcon: {
    opacity: 0.95,
  },
  
  // Form
  formContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
    marginTop: 20,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  textArea: {
    height: 130,
    textAlignVertical: 'top',
  },
  categoriesRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipSelected: {
    backgroundColor: '#7459f0',
    borderColor: '#7459f0',
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  categoryText: {
    fontSize: 14,
    color: '#71717A',
    fontWeight: '600',
  },
  categoryTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  
  // Button avec Gradient harmonisé
  submitButtonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 40,
  },
  submitButton: {
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  // Progress Overlay amélioré avec gradient
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#E5E7EB',
  },
  progressBarContainer: {
    width: '100%',
    height: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
});