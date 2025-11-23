import AuthComponent from "@/components/AuthComponent";
import React from "react";
import { StyleSheet, View } from "react-native";

export default function AuthPage() {
  return (
    <View style={styles.container}>
      <AuthComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});