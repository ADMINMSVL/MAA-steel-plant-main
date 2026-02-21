import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface DashboardStats {
  total_entries: number;
  pending_entries: number;
  total_purchase_orders: number;
  total_sales_orders: number;
  average_yield: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/dashboard/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const quickActions = [
    { title: 'Gate Entry', icon: 'enter', color: '#4caf50', screen: '/gate-entry/create' },
    { title: 'Weighbridge', icon: 'scale', color: '#2196f3', screen: '/weighbridge/create' },
    { title: 'Quality Check', icon: 'checkmark-circle', color: '#ff9800', screen: '/quality/create' },
    { title: 'Reports', icon: 'document-text', color: '#9c27b0', screen: '/reports/list' },
  ];

  const manufacturingModules = [
    { title: 'Melting Shop', icon: 'flame', color: '#ff5722', screen: '/melting', desc: 'Furnace Operations' },
    { title: 'CCM - Billets', icon: 'cube', color: '#2196f3', screen: '/ccm', desc: 'Billet Casting' },
    { title: 'Rolling Mill', icon: 'layers', color: '#4caf50', screen: '/rolling', desc: 'TMT Production' },
    { title: 'Maintenance', icon: 'construct', color: '#9c27b0', screen: '/maintenance', desc: 'Breakdowns & PM' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e88e5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.username}>{user?.username}</Text>
        <Text style={styles.role}>{user?.role.replace('_', ' ').toUpperCase()}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#e3f2fd' }]}>
          <Ionicons name="enter" size={32} color="#1e88e5" />
          <Text style={styles.statValue}>{stats?.total_entries || 0}</Text>
          <Text style={styles.statLabel}>Total Entries</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#fff3e0' }]}>
          <Ionicons name="time" size={32} color="#f57c00" />
          <Text style={styles.statValue}>{stats?.pending_entries || 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#e8f5e9' }]}>
          <Ionicons name="cart" size={32} color="#43a047" />
          <Text style={styles.statValue}>{stats?.total_purchase_orders || 0}</Text>
          <Text style={styles.statLabel}>Purchase Orders</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#f3e5f5' }]}>
          <Ionicons name="trending-up" size={32} color="#8e24aa" />
          <Text style={styles.statValue}>{stats?.average_yield.toFixed(1) || 0}%</Text>
          <Text style={styles.statLabel}>Avg Yield</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {quickActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.actionCard, { backgroundColor: action.color }]}
            onPress={() => router.push(action.screen as any)}
          >
            <Ionicons name={action.icon as any} size={32} color="#ffffff" />
            <Text style={styles.actionText}>{action.title}</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#0d47a1',
    padding: 24,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 16,
    color: '#bbdefb',
  },
  username: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  role: {
    fontSize: 14,
    color: '#90caf9',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#263238',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#546e7a',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#263238',
    marginLeft: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    width: '48%',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 8,
    textAlign: 'center',
  },
});
