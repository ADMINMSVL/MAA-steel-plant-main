import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

interface BilletProduction {
  _id: string;
  billet_batch: string;
  heat_id: string;
  ccm_number: number;
  shift: string;
  billet_size: string;
  billet_count: number;
  total_weight: number;
  status: string;
  quality_grade?: string;
}

export default function CCMList() {
  const router = useRouter();
  const { user } = useAuth();
  const [billets, setBillets] = useState<BilletProduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const fetchData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ccm/billet`);
      if (response.ok) {
        const data = await response.json();
        setBillets(data);
      }
    } catch (error) {
      console.error('Error fetching CCM data:', error);
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
      case 'casting': return '#ff9800';
      case 'cooling': return '#2196f3';
      case 'completed': return '#4caf50';
      default: return '#78909c';
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return '#4caf50';
      case 'B': return '#ff9800';
      case 'C': return '#f44336';
      default: return '#78909c';
    }
  };

  const handleDelete = async (billetId: string) => {
    const confirmDelete = () => {
      if (Platform.OS === 'web') {
        return window.confirm('Delete this billet batch?');
      }
      return new Promise((resolve) => {
        Alert.alert('Delete', 'Delete this billet batch?',
          [{ text: 'Cancel', onPress: () => resolve(false) },
           { text: 'Delete', onPress: () => resolve(true), style: 'destructive' }]
        );
      });
    };

    if (await confirmDelete()) {
      try {
        await fetch(`${BACKEND_URL}/api/ccm/billet/${billetId}`, { method: 'DELETE' });
        fetchData();
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const canDelete = user?.role === 'admin' || user?.role === 'manager';

  const todayCount = billets.filter(b => {
    const today = new Date().toDateString();
    return new Date(b.start_time || '').toDateString() === today;
  }).length;

  const totalWeight = billets.reduce((sum, b) => sum + (b.total_weight || 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CCM - Billet Casting</Text>
        <TouchableOpacity onPress={() => router.push('/ccm/create')} style={styles.addButton}>
          <Ionicons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#e3f2fd' }]}>
            <Text style={styles.statValue}>{todayCount}</Text>
            <Text style={styles.statLabel}>Today's Batches</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#e8f5e9' }]}>
            <Text style={styles.statValue}>{(totalWeight / 1000).toFixed(1)}T</Text>
            <Text style={styles.statLabel}>Total Production</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Batches</Text>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : billets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={48} color="#78909c" />
            <Text style={styles.emptyText}>No billet batches yet</Text>
            <TouchableOpacity style={styles.createButton} onPress={() => router.push('/ccm/create')}>
              <Text style={styles.createButtonText}>Record New Batch</Text>
            </TouchableOpacity>
          </View>
        ) : (
          billets.map((billet) => (
            <View key={billet._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.batchNumber}>{billet.billet_batch}</Text>
                  <Text style={styles.info}>CCM-{billet.ccm_number} | {billet.shift} | {billet.billet_size}</Text>
                </View>
                <View style={styles.badges}>
                  <View style={[styles.badge, { backgroundColor: getStatusColor(billet.status) }]}>
                    <Text style={styles.badgeText}>{billet.status.toUpperCase()}</Text>
                  </View>
                  {billet.quality_grade && (
                    <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(billet.quality_grade) }]}>
                      <Text style={styles.badgeText}>{billet.quality_grade}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.cardDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Billets</Text>
                  <Text style={styles.detailValue}>{billet.billet_count}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Weight</Text>
                  <Text style={styles.detailValue}>{billet.total_weight} kg</Text>
                </View>
              </View>
              {canDelete && (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(billet._id)}>
                  <Ionicons name="trash-outline" size={18} color="#f44336" />
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#2196f3', padding: 16, paddingTop: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  addButton: { padding: 8 },
  content: { flex: 1, padding: 16 },
  statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#263238' },
  statLabel: { fontSize: 12, color: '#78909c', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#263238', marginBottom: 12 },
  loadingText: { textAlign: 'center', color: '#78909c', marginTop: 20 },
  emptyCard: { backgroundColor: '#fff', padding: 32, borderRadius: 12, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#78909c', marginTop: 12 },
  createButton: { backgroundColor: '#2196f3', padding: 12, borderRadius: 8, marginTop: 16 },
  createButtonText: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  batchNumber: { fontSize: 18, fontWeight: 'bold', color: '#263238' },
  info: { fontSize: 13, color: '#78909c', marginTop: 2 },
  badges: { flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  gradeBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  cardDetails: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  detailItem: { flex: 1, alignItems: 'center' },
  detailLabel: { fontSize: 12, color: '#78909c' },
  detailValue: { fontSize: 16, fontWeight: '600', color: '#263238', marginTop: 2 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0', gap: 6 },
  deleteText: { color: '#f44336', fontWeight: '600' },
});
