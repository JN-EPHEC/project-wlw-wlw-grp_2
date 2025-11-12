import { Link } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Landing() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenue</Text>

      <Link href="/auth" asChild>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Aller à authentification</Text>
        </TouchableOpacity>
      </Link>

      <Link href="/storage" asChild>
        <TouchableOpacity
          style={StyleSheet.flatten([styles.button, styles.secondary])}
        >
          <Text style={styles.buttonText}>Aller au storage</Text>
        </TouchableOpacity>
      </Link>

      <Link href="/firestore" asChild>
        <TouchableOpacity
          style={StyleSheet.flatten([
            styles.button,
            { backgroundColor: "#8E44AD" },
          ])}
        >
          <Text style={styles.buttonText}>Exemple Firestore (CRUD)</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 24 },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: "80%",
    alignItems: "center",
    marginBottom: 12,
  },
  secondary: { backgroundColor: "#34C759" },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
});