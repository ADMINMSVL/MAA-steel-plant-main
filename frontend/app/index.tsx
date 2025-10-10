import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Delay to show splash
    setTimeout(() => {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/auth/login');
      }
    }, 1000);
  }, [isAuthenticated]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏭 Steel Plant</Text>
      <Text style={styles.subtitle}>Gate-to-Gate Management</Text>
      <ActivityIndicator size="large" color="#1e88e5" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d47a1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#bbdefb',
    marginBottom: 32,
  },
  loader: {
    marginTop: 16,
  },
});