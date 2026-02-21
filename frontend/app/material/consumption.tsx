import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function MaterialConsumption() {
  const router = useRouter();

  const showComingSoon = () => {
    if (Platform.OS === 'web') {
      alert('Material Consumption feature coming soon!');
    } else {
      Alert.alert('Coming Soon', 'Material Consumption feature is under development');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Material Consumption</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Ionicons name="bar-chart" size={64} color="#ff9800" />
          <Text style={styles.title}>Material Consumption</Text>
          <Text style={styles.description}>Track and analyze material usage</Text>
          <TouchableOpacity style={styles.button} onPress={showComingSoon}>
            <Text style={styles.buttonText}>Coming Soon</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#ff9800', padding: 16, paddingTop: 48, flexDirection: 'row', alignItems: 'center' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginLeft: 16 },
  content: { flex: 1, padding: 16 },
  card: { backgroundColor: '#fff', padding: 32, borderRadius: 12, alignItems: 'center', elevation: 3 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#263238', marginTop: 16 },
  description: { fontSize: 16, color: '#78909c', marginTop: 8, textAlign: 'center' },
  button: { backgroundColor: '#ff9800', padding: 16, borderRadius: 8, marginTop: 24, width: '100%' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
});
