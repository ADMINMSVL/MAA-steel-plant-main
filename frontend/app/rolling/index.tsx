import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

interface RollingProduction {
  _id: string;
  production_batch: string;
  mill_number: number;
  shift: string;
  product_size: string;
  bundle_count: number;
  total_weight: number;
  status: string;
  quality_check?: string;
}

export default function RollingList() {
  const router = useRouter();
  const { user } = useAuth();
  const [productions, setProductions] = useState<RollingProduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const fetchData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/rolling/production`);
      if (response.ok) {
        const data = await response.json();
        setProductions(data);
      }
    } catch (error) {
      console.error('Error fetching rolling data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'rolling': return '#ff9800';
      case 'cooling': return '#2196f3';
      case 'bundling': return '#9c27b0';
      case 'completed': return '#4caf50';
      default: return '#78909c';
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = Platform.OS === 'web' 
      ? window.confirm('Delete this production record?')
      : await new Promise((resolve) => Alert.alert('Delete', 'Delete this record?', 
          [{ text: 'Cancel', onPress: () => resolve(false) }, { text: 'Delete', onPress: () => resolve(true), style: 'destructive' }]));
    
    if (confirm) {
      await fetch(`${BACKEND_URL}/api/rolling/production/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const canDelete = user?.role === 'admin' || user?.role === 'manager';
  const totalWeight = productions.reduce((sum, p) => sum + (p.total_weight || 0), 0);

  // Group by product size
  const sizeBreakdown = productions.reduce((acc, p) => {
    acc[p.product_size] = (acc[p.product_size] || 0) + p.total_weight;
    return acc;
  }, {} as Record<string, number>);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rolling Mill - TMT</Text>
        <TouchableOpacity onPress={() => router.push('/rolling/create')} style={styles.addButton}>
          <Ionicons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Summary Stats */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Today's Production</Text>
          <Text style={styles.summaryValue}>{(totalWeight / 1000).toFixed(2)} Tons</Text>
          <View style={styles.sizeGrid}>
            {Object.entries(sizeBreakdown).map(([size, weight]) => (
              <View key={size} style={styles.sizeItem}>
                <Text style={styles.sizeLabel}>{size}</Text>
                <Text style={styles.sizeValue}>{(weight / 1000).toFixed(1)}T</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Production Records</Text>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : productions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="layers-outline" size={48} color="#78909c" />
            <Text style={styles.emptyText}>No production records</Text>
            <TouchableOpacity style={styles.createButton} onPress={() => router.push('/rolling/create')}>
              <Text style={styles.createButtonText}>Record Production</Text>
            </TouchableOpacity>
          </View>
        ) : (
          productions.map((prod) => (
            <View key={prod._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.batchNumber}>{prod.production_batch}</Text>
                  <Text style={styles.info}>Mill-{prod.mill_number} | {prod.shift}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getStatusColor(prod.status) }]}>
                  <Text style={styles.badgeText}>{prod.status.toUpperCase()}</Text>
                </View>
              </View>
              <View style={styles.cardDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Size</Text>
                  <Text style={styles.detailValueLarge}>{prod.product_size}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Bundles</Text>
                  <Text style={styles.detailValue}>{prod.bundle_count}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Weight</Text>
                  <Text style={styles.detailValue}>{prod.total_weight} kg</Text>
                </View>
              </View>
              {prod.quality_check && (
                <View style={[styles.qualityBadge, { backgroundColor: prod.quality_check === 'passed' ? '#e8f5e9' : '#ffebee' }]}>
                  <Ionicons name={prod.quality_check === 'passed' ? 'checkmark-circle' : 'close-circle'} size={16} color={prod.quality_check === 'passed' ? '#4caf50' : '#f44336'} />
                  <Text style={{ color: prod.quality_check === 'passed' ? '#4caf50' : '#f44336', fontWeight: '600' }}>QC {prod.quality_check}</Text>
                </View>
              )}
              {canDelete && (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(prod._id)}>
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
  header: { backgroundColor: '#4caf50', padding: 16, paddingTop: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  addButton: { padding: 8 },
  content: { flex: 1, padding: 16 },
  summaryCard: { backgroundColor: '#4caf50', borderRadius: 16, padding: 20, marginBottom: 20 },
  summaryTitle: { color: '#c8e6c9', fontSize: 14 },
  summaryValue: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginVertical: 8 },
  sizeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8 },
  sizeItem: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  sizeLabel: { color: '#fff', fontSize: 12 },
  sizeValue: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#263238', marginBottom: 12 },
  loadingText: { textAlign: 'center', color: '#78909c', marginTop: 20 },
  emptyCard: { backgroundColor: '#fff', padding: 32, borderRadius: 12, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#78909c', marginTop: 12 },
  createButton: { backgroundColor: '#4caf50', padding: 12, borderRadius: 8, marginTop: 16 },
  createButtonText: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  batchNumber: { fontSize: 16, fontWeight: 'bold', color: '#263238' },
  info: { fontSize: 13, color: '#78909c', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  cardDetails: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  detailItem: { flex: 1, alignItems: 'center' },
  detailLabel: { fontSize: 12, color: '#78909c' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#263238', marginTop: 2 },
  detailValueLarge: { fontSize: 18, fontWeight: 'bold', color: '#4caf50', marginTop: 2 },
  qualityBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8, borderRadius: 8, marginTop: 12 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0', gap: 6 },
  deleteText: { color: '#f44336', fontWeight: '600' },
});
