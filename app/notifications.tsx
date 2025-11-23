import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

export default function Notifications() {

  // 🔹 Ici on définit notre tableau de notifications
  const notifications = [
    {
      id: 1,
      username: "Alice",
      message: "a commencé à vous suivre",
      image: "https://randomuser.me/api/portraits/women/1.jpg",
    },
    {
      id: 2,
      username: "Bob",
      message: "a aimé votre vidéo",
      image: "https://randomuser.me/api/portraits/men/2.jpg",
    },
    {
      id: 3,
      username: "Charlie",
      message: "vous avez atteint les 100 000 vues",
      image: "https://randomuser.me/api/portraits/men/3.jpg",
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* On affichera les notifications ici */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
});
