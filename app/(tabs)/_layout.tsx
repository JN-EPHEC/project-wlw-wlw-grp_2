import CreatorTabs from '../navigation/CreatorTabs';

// Expo Router already provides the root NavigationContainer. Do not wrap
// navigator components with another NavigationContainer in nested layouts.
export default function App() {
  return <CreatorTabs />;
}