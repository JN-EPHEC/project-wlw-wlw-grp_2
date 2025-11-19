import { Slot } from "expo-router";
import "react-native-reanimated";

// Removed unstable_settings.anchor to avoid expo-router looking for a grouped
// layout file at `app/(tabs)/_layout.tsx` when that folder doesn't exist.
export default function RootLayout() {
  // Root layout for the app — child routes are rendered via <Slot />
  return <Slot />;
}