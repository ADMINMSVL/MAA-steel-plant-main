import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  // Check if user is admin or manager
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1e88e5',
        tabBarInactiveTintColor: '#78909c',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#0d47a1',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gate"
        options={{
          title: 'Gate',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="enter" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vouchers"
        options={{
          title: 'Vouchers',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
