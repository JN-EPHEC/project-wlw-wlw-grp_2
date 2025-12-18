import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, Dimensions, ActivityIndicator, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db, auth } from '@/firebaseConfig';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'marketing', label: 'Marketing Digital', icon: '📱' },
  { id: 'ia', label: 'IA', icon: '🤖' },
  { id: 'ecommerce', label: 'E-commerce', icon: '🛒' },
  { id: 'design', label: 'Design & UX', icon: '🎨' },
  { id: 'dev', label: 'Développement', icon: '💻' },
  { id: 'business', label: 'Business', icon: '📊' },
];

export default function UploadScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'upload' | 'details' | 'success'>('upload');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      videoMaxDuration: 60,
      quality: 1,
    });

    if (!result.canceled) {
      setVideoUri(result.assets[0].uri);
      setStep('details');
    }
  };

  const handlePublish = async () => {
    if (!videoUri || !title || !category) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Erreur', 'Vous devez être connecté pour publier une vidéo');
      return;
    }

    // Stocker currentUser dans une variable pour TypeScript
    const currentUser = auth.currentUser;

    setIsProcessing(true);
    setUploadProgress(0);

    try {
      // 1. Convertir l'URI en blob
      const response = await fetch(videoUri);
      const blob = await response.blob();

      // 2. Créer référence Storage
      const timestamp = Date.now();
      const filename = `videos/${currentUser.uid}/${timestamp}.mp4`;
      const storageRef = ref(storage, filename);

      // 3. Upload avec progression
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
          console.log('Upload : ' + Math.round(progress) + '%');
        },
        (error) => {
          console.error('Erreur upload:', error);
          Alert.alert('Erreur', 'Impossible d\'uploader la vidéo : ' + error.message);
          setIsProcessing(false);
        },
        async () => {
          // 4. Récupérer l'URL de téléchargement
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('Vidéo disponible à:', downloadURL);

          // 5. Sauvegarder dans Firestore
          await addDoc(collection(db, 'videos'), {
            title,
            description,
            category,
            videoUrl: downloadURL,
            thumbnailUrl: '',
            creatorId: currentUser.uid,
            creatorEmail: currentUser.email,
            creatorName: currentUser.displayName || 'Formateur',
            createdAt: serverTimestamp(),
            views: 0,
            likes: 0,
            comments: 0,
            duration: 0,
          });

          console.log('✅ Vidéo publiée avec succès !');
          setIsProcessing(false);
          setStep('success');
        }
      );
    } catch (error: any) {
      console.error('Erreur complète:', error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue');
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setStep('upload');
    setTitle('');
    setDescription('');
    setCategory('');
    setVideoUri(null);
    setUploadProgress(0);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#a855f7', '#9333ea']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => step === 'details' ? setStep('upload') : router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Publier une vidéo</Text>
            <Text style={styles.headerSub}>Partagez votre expertise</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {step === 'upload' && (
          <View style={styles.stepContainer}>
            <TouchableOpacity style={styles.uploadCard} onPress={pickVideo}>
              <LinearGradient colors={['#a855f7', '#9333ea']} style={styles.uploadIconCircle}>
                <Ionicons name="cloud-upload" size={40} color="white" />
              </LinearGradient>
              <Text style={styles.uploadMainTitle}>Téléchargez votre vidéo</Text>
              <Text style={styles.uploadInfo}>Formats : MP4, MOV (max 60s)</Text>
              <View style={styles.pickBtn}>
                <Text style={styles.pickBtnText}>Choisir un fichier</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.statsPreview}>
               <View style={styles.statMiniCard}><Text style={styles.statEmoji}>👁️</Text><Text style={styles.statVal}>2.5K</Text><Text style={styles.statSub}>Vues</Text></View>
               <View style={styles.statMiniCard}><Text style={styles.statEmoji}>❤️</Text><Text style={styles.statVal}>156</Text><Text style={styles.statSub}>Likes</Text></View>
               <View style={styles.statMiniCard}><Text style={styles.statEmoji}>⭐</Text><Text style={styles.statVal}>8.2%</Text><Text style={styles.statSub}>Engag.</Text></View>
            </View>

            <View style={styles.tipsCard}>
              <View style={styles.tipsHeader}>
                <Ionicons name="sparkles" size={18} color="#9333EA" />
                <Text style={styles.tipsTitle}>Conseils pour réussir</Text>
              </View>
              <Text style={styles.tipsText}>• Filmez en format vertical (9:16)</Text>
              <Text style={styles.tipsText}>• Captez l'attention dès les 3s</Text>
              <Text style={styles.tipsText}>• Ajoutez des sous-titres</Text>
            </View>
          </View>
        )}

        {step === 'details' && (
          <View style={styles.formContainer}>
            <Text style={styles.label}>Titre de la vidéo *</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ex: Les 3 secrets du SEO" 
              value={title} 
              onChangeText={setTitle}
              maxLength={100}
            />

            <Text style={styles.label}>Description *</Text>
            <TextInput 
              style={[styles.input, styles.textArea]} 
              placeholder="Décrivez votre contenu..." 
              value={description} 
              onChangeText={setDescription}
              multiline
            />

            <Text style={styles.label}>Catégorie *</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity 
                  key={cat.id} 
                  style={[styles.catCard, category === cat.id && styles.catCardActive]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Text style={styles.catIcon}>{cat.icon}</Text>
                  <Text style={[styles.catLabel, category === cat.id && styles.catLabelActive]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.publishBtn, (!title || !category) && styles.disabledBtn]} 
              onPress={handlePublish}
              disabled={isProcessing || !title || !category}
            >
              {isProcessing ? (
                <View style={{ alignItems: 'center' }}>
                  <ActivityIndicator color="white" />
                  <Text style={{ color: 'white', marginTop: 8, fontSize: 14 }}>
                    Upload : {Math.round(uploadProgress)}%
                  </Text>
                </View>
              ) : (
                <Text style={styles.publishBtnText}>Publier la vidéo</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 'success' && (
          <View style={styles.successContainer}>
            <View style={styles.checkCircle}><Ionicons name="checkmark" size={50} color="white" /></View>
            <Text style={styles.successTitle}>Vidéo publiée ! 🎉</Text>
            <TouchableOpacity style={styles.finishBtn} onPress={() => router.push('/(tabs-formateur)' as any)}>
              <Text style={styles.finishBtnText}>Retour à l'accueil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.againBtn} onPress={resetForm}>
              <Text style={styles.againBtnText}>Publier une autre vidéo</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { paddingTop: 50, paddingBottom: 60, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  headerTitleContainer: { marginLeft: 15 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 13, color: '#E9D5FF' },
  scrollContent: { padding: 20 },
  stepContainer: { marginTop: -40 },
  uploadCard: { backgroundColor: 'white', borderRadius: 24, padding: 30, alignItems: 'center', elevation: 8, shadowOpacity: 0.1, shadowRadius: 10 },
  uploadIconCircle: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  uploadMainTitle: { fontSize: 18, fontWeight: 'bold', color: '#18181B' },
  uploadInfo: { fontSize: 12, color: '#71717A', marginVertical: 8 },
  pickBtn: { backgroundColor: '#F5EEFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 10 },
  pickBtnText: { color: '#9333EA', fontWeight: 'bold' },
  statsPreview: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  statMiniCard: { backgroundColor: 'white', width: (width - 60) / 3, padding: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  statEmoji: { fontSize: 20, marginBottom: 4 },
  statVal: { fontWeight: 'bold', fontSize: 14 },
  statSub: { fontSize: 10, color: '#71717A' },
  tipsCard: { marginTop: 20, backgroundColor: '#F5EEFF', padding: 20, borderRadius: 20, borderLeftWidth: 5, borderLeftColor: '#9333EA' },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  tipsTitle: { fontWeight: 'bold', color: '#9333EA' },
  tipsText: { fontSize: 13, color: '#6B21A8', marginBottom: 5 },
  formContainer: { marginTop: -20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#18181B', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E4E4E7', borderRadius: 12, padding: 15, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 },
  catCard: { width: '48%', backgroundColor: 'white', borderWidth: 1, borderColor: '#E4E4E7', padding: 15, borderRadius: 16, marginBottom: 10, alignItems: 'center' },
  catCardActive: { borderColor: '#9333EA', backgroundColor: '#F5EEFF' },
  catIcon: { fontSize: 24, marginBottom: 4 },
  catLabel: { fontSize: 12, color: '#71717A', fontWeight: '500' },
  catLabelActive: { color: '#9333EA', fontWeight: 'bold' },
  publishBtn: { backgroundColor: '#9333EA', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 30 },
  publishBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  disabledBtn: { backgroundColor: '#D4D4D8' },
  successContainer: { alignItems: 'center', paddingTop: 40 },
  checkCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: 'bold' },
  finishBtn: { backgroundColor: '#9333ea', width: '100%', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 40 },
  finishBtnText: { color: 'white', fontWeight: 'bold' },
  againBtn: { marginTop: 15 },
  againBtnText: { color: '#9333ea', fontWeight: 'bold' }
});