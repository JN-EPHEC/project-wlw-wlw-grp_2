import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform } from 'react-native';

import Explore from '../(tabs)/explore';
import HomeUser from '../(tabs)/homeuser';
import Notifications from '../(tabs)/notifications';
import UserProfileContentCreator from '../(tabs)/userprofile';


export type TabMenuParamList = {
  Home: undefined;
  Explore: undefined;
  Notifications: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabMenuParamList>();

export default function CreatorTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 72 : 60,
          paddingBottom: Platform.OS === 'ios' ? 14 : 8,
          paddingTop: 6,
          borderTopWidth: 1,
          borderTopColor: '#E6E6E6',
          backgroundColor: '#ffffff',
          elevation: 0,
          shadowColor: 'transparent',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Explore') {
            iconName = focused ? 'compass' : 'compass-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Logout') {
            iconName = 'log-out-outline';
          }

          return <Ionicons name={iconName} size={28} color={color} />;
        },
        tabBarActiveTintColor: '#6B46FF',
        tabBarInactiveTintColor: '#B0B0B0',
      })}
    >
  <Tab.Screen name="Home" component={HomeUser} />
  <Tab.Screen name="Explore" component={Explore} />
  <Tab.Screen name="Notifications" component={Notifications} />
  <Tab.Screen name="Profile" component={UserProfileContentCreator} />
    </Tab.Navigator>
  );
}
