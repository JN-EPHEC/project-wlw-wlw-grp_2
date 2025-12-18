import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function HelpScreen() {
  const router = useRouter();
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);

  const faqs = [
    {
      question: 'Comment fonctionne SwipeSkills ?',
      answer: "SwipeSkills est une plateforme d'apprentissage mobile qui propose des vidéos éducatives courtes. Swipez vers le haut ou le bas pour découvrir de nouveaux contenus, aimez vos vidéos favorites, suivez vos formateurs préférés et progressez en gagnant des badges et de l'XP."
    },
    {
      question: 'Comment gagner des badges et des niveaux ?',
      answer: "Vous gagnez de l'XP en regardant des vidéos, en complétant des formations et en interagissant avec le contenu. Chaque niveau atteint vous rapproche de nouveaux badges. Les badges sont attribués selon vos domaines d'expertise et votre progression."
    },
    {
      question: 'Puis-je télécharger des vidéos pour les regarder hors ligne?',
      answer: "Pour le moment, la fonctionnalité de téléchargement hors ligne n'est pas disponible. Toutes les vidéos doivent être visionnées en ligne. Cette fonctionnalité pourrait être ajoutée dans une future mise à jour."
    },
    {
      question: 'Comment devenir créateur de contenu ?',
      answer: "Lors de votre inscription, choisissez le rôle 'Formateur'. Vous pourrez ensuite créer et publier vos propres vidéos éducatives depuis l'onglet Créer. Assurez-vous que votre contenu respecte nos guidelines communautaires."
    },
    {
      question: 'Comment signaler un contenu inapproprié?',
      answer: "Sur chaque vidéo, appuyez sur le bouton de partage puis sélectionnez 'Signaler'. Choisissez la raison du signalement et notre équipe examinera le contenu dans les 24-48 heures."
    },
    {
      question: 'Pourquoi je ne reçois pas de notifications?',
      answer: "Vérifiez que les notifications sont activées dans les Paramètres de l'application et dans les paramètres de votre téléphone. Assurez-vous également d'avoir une connexion internet active."
    },
    {
      question: 'Comment supprimer mon compte ?',
      answer: "Allez dans Profil > Paramètres puis cliquez sur 'Désactiver mon compte'. Cette action est irréversible et toutes vos données seront supprimées définitivement."
    },
    {
      question: 'Les vidéos consomment-elles beaucoup de données ?',
      answer: "La consommation de données dépend de la qualité vidéo. En moyenne, une vidéo de 60 secondes consomme entre 5-15 Mo. Nous recommandons d'utiliser le WiFi pour une expérience optimale."
    }
  ];

  const handleEmail = () => {
    Linking.openURL('mailto:support@swipeskills.com');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#18181b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Besoin d'aide ?</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {/* Banner */}
        <LinearGradient
          colors={['#a855f7', '#9333ea']}
          style={styles.banner}
        >
          <View style={styles.bannerIcon}>
            <Ionicons name="help-circle" size={24} color="#fff" />
          </View>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>Comment pouvons-nous vous aider ?</Text>
            <Text style={styles.bannerSubtitle}>
              Trouvez rapidement des réponses à vos questions
            </Text>
          </View>
        </LinearGradient>

        {/* FAQ List */}
        <View style={styles.faqList}>
          {faqs.map((faq, index) => (
            <View key={index} style={styles.faqItem}>
              <TouchableOpacity
                style={styles.faqButton}
                onPress={() => setOpenQuestion(openQuestion === index ? null : index)}
              >
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Ionicons 
                  name={openQuestion === index ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#a1a1aa" 
                />
              </TouchableOpacity>
              {openQuestion === index && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Contact Support */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Vous ne trouvez pas votre réponse ?</Text>
          <Text style={styles.contactSubtitle}>Notre équipe support est là pour vous aider</Text>
          <TouchableOpacity style={styles.contactButton} onPress={handleEmail}>
            <Text style={styles.contactButtonText}>Contacter le support</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#18181b',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  banner: {
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
    marginBottom: 32,
  },
  bannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#e9d5ff',
  },
  faqList: {
    gap: 12,
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  faqButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '500',
    color: '#18181b',
    flex: 1,
    paddingRight: 16,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#52525b',
    lineHeight: 22,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#18181b',
    marginBottom: 8,
  },
  contactSubtitle: {
    fontSize: 13,
    color: '#71717a',
    marginBottom: 16,
    textAlign: 'center',
  },
  contactButton: {
    backgroundColor: '#9333ea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});