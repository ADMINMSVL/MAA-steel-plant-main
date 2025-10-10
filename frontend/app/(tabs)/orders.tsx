import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Orders() {
  const router = useRouter();

  const orderFeatures = [
    {
      icon: 'cart',
      title: 'Purchase Orders',
      description: 'Create and manage purchase orders',
      color: '#4caf50',
      screen: '/orders/purchase',
    },
    {
      icon: 'cube',
      title: 'Sales Orders',
      description: 'Create and manage sales orders',
      color: '#2196f3',
      screen: '/orders/sales',
    },
    {
      icon: 'bar-chart',
      title: 'Material Consumption',
      description: 'Track material usage',
      color: '#ff9800',
      screen: '/material/consumption',
    },
    {
      icon: 'trending-up',
      title: 'Material Yield',
      description: 'Calculate and track yield',
      color: '#9c27b0',
      screen: '/material/yield',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orders & Materials</Text>
        <Text style={styles.headerSubtitle}>Manage orders and material tracking</Text>
      </View>

      <View style={styles.grid}>
        {orderFeatures.map((feature, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.card, { borderLeftColor: feature.color }]}
            onPress={() => router.push(feature.screen as any)}
          >
            <View style={[styles.iconContainer, { backgroundColor: feature.color }]}>
              <Ionicons name={feature.icon as any} size={32} color="#ffffff" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{feature.title}</Text>
              <Text style={styles.cardDescription}>{feature.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9e9e9e" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#0d47a1',
    padding: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#90caf9',
    marginTop: 4,
  },
  grid: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#78909c',
  },
});
