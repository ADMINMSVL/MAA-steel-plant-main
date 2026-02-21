import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

interface MeltingHeat {
  _id: string;
  heat_number: string;
  furnace_number: number;
  shift: string;
  start_time: string;
  total_charge_weight: number;
  molten_metal_weight?: number;
  yield_percentage?: number;
  status: string;
}

export default function MeltingList() {
  const router = useRouter();
  const { user } = useAuth();
  const [heats, setHeats] = useState<MeltingHeat[]>([]);
  const [stats, setStats] = useState({ total_heats: 0, today_heats: 0, active_heats: 0, average_yield: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const fetchData = async () => {
    try {
      const [heatsRes, statsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/melting/heat`),
        fetch(`${BACKEND_URL}/api/melting/stats`)
      ]);
      
      if (heatsRes.ok) {
        const heatsData = await heatsRes.json();
        setHeats(heatsData);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching melting data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'charging': return '#ff9800';
      case 'melting': return '#f44336';
      case 'tapped': return '#2196f3';
      case 'completed': return '#4caf50';
      default: return '#78909c';
    }
  };

  const handleDelete = async (heatId: string) => {
    const confirmDelete = () => {
      if (Platform.OS === 'web') {
        return window.confirm('Are you sure you want to delete this heat record?');
      }
      return new Promise((resolve) => {
        Alert.alert(
          'Delete Heat',
          'Are you sure you want to delete this heat record?',
          [
            { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
            { text: 'Delete', onPress: () => resolve(true), style: 'destructive' }
          ]
        );
      });
    };

    if (await confirmDelete()) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/melting/heat/${heatId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          fetchData();
        }
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const canDelete = user?.role === 'admin' || user?.role === 'manager';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Melting Shop</Text>
        <TouchableOpacity onPress={() => router.push('/melting/create')} style={styles.addButton}>
          <Ionicons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#e3f2fd' }]}>
            <Text style={styles.statValue}>{stats.today_heats}</Text>
            <Text style={styles.statLabel}>Today's Heats</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fff3e0' }]}>
            <Text style={styles.statValue}>{stats.active_heats}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#e8f5e9' }]}>
            <Text style={styles.statValue}>{stats.average_yield}%</Text>
            <Text style={styles.statLabel}>Avg Yield</Text>
          </View>
        </View>

        {/* Heat List */}
        <Text style={styles.sectionTitle}>Recent Heats</Text>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : heats.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="flame-outline" size={48} color="#78909c" />
            <Text style={styles.emptyText}>No heats recorded yet</Text>
            <TouchableOpacity style={styles.createButton} onPress={() => router.push('/melting/create')}>
              <Text style={styles.createButtonText}>Create New Heat</Text>
            </TouchableOpacity>
          </View>
        ) : (
          heats.map((heat) => (
            <View key={heat._id} style={styles.heatCard}>
              <View style={styles.heatHeader}>
                <View>
                  <Text style={styles.heatNumber}>{heat.heat_number}</Text>
                  <Text style={styles.furnaceInfo}>Furnace {heat.furnace_number} | {heat.shift}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(heat.status) }]}>
                  <Text style={styles.statusText}>{heat.status.toUpperCase()}</Text>
                </View>
              </View>
              <View style={styles.heatDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Charge</Text>
                  <Text style={styles.detailValue}>{heat.total_charge_weight} kg</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Output</Text>
                  <Text style={styles.detailValue}>{heat.molten_metal_weight || '-'} kg</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Yield</Text>
                  <Text style={styles.detailValue}>{heat.yield_percentage || '-'}%</Text>
                </View>
              </View>
              <View style={styles.heatActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push(`/melting/update?id=${heat._id}`)}
                >
                  <Ionicons name="create-outline" size={20} color="#1e88e5" />
                  <Text style={styles.actionText}>Update</Text>
                </TouchableOpacity>
                {canDelete && (
                  <TouchableOpacity 
                    style={[styles.actionButton, { borderColor: '#f44336' }]}
                    onPress={() => handleDelete(heat._id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#f44336" />
                    <Text style={[styles.actionText, { color: '#f44336' }]}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#ff5722', padding: 16, paddingTop: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  addButton: { padding: 8 },
  content: { flex: 1, padding: 16 },
  statsContainer: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#263238' },
  statLabel: { fontSize: 12, color: '#78909c', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#263238', marginBottom: 12 },
  loadingText: { textAlign: 'center', color: '#78909c', marginTop: 20 },
  emptyCard: { backgroundColor: '#fff', padding: 32, borderRadius: 12, alignItems: 'center', elevation: 2 },
  emptyText: { fontSize: 16, color: '#78909c', marginTop: 12 },
  createButton: { backgroundColor: '#ff5722', padding: 12, borderRadius: 8, marginTop: 16 },
  createButtonText: { color: '#fff', fontWeight: '600' },
  heatCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  heatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heatNumber: { fontSize: 18, fontWeight: 'bold', color: '#263238' },
  furnaceInfo: { fontSize: 14, color: '#78909c', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  heatDetails: { flexDirection: 'row', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  detailItem: { flex: 1, alignItems: 'center' },
  detailLabel: { fontSize: 12, color: '#78909c' },
  detailValue: { fontSize: 16, fontWeight: '600', color: '#263238', marginTop: 2 },
  heatActions: { flexDirection: 'row', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderWidth: 1, borderColor: '#1e88e5', borderRadius: 8, gap: 6 },
  actionText: { fontSize: 14, fontWeight: '600', color: '#1e88e5' },
});
