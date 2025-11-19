import StorageComponent from "@/components/StorageComponent";
import React from "react";
import { StyleSheet, View } from "react-native";

export default function StoragePage() {
  return (
    <View style={styles.container}>
      <StorageComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});