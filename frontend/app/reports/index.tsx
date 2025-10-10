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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function Reports() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [gateEntries, setGateEntries] = useState([]);
  const [weighbridge, setWeighbridge] = useState([]);
  const [yields, setYields] = useState([]);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [statsRes, entriesRes, weighbridgeRes, yieldsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/dashboard/stats`),
        fetch(`${BACKEND_URL}/api/gate-entry`),
        fetch(`${BACKEND_URL}/api/weighbridge`),
        fetch(`${BACKEND_URL}/api/material-yield`),
      ]);

      const statsData = await statsRes.json();
      const entriesData = await entriesRes.json();
      const weighbridgeData = await weighbridgeRes.json();
      const yieldsData = await yieldsRes.json();

      setStats(statsData);
      setGateEntries(entriesData);
      setWeighbridge(weighbridgeData);
      setYields(yieldsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports & Analytics</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary Overview</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#e3f2fd' }]}>
            <Ionicons name="enter" size={28} color="#1e88e5" />
            <Text style={styles.statValue}>{stats?.total_entries || 0}</Text>
            <Text style={styles.statLabel}>Total Entries</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#fff3e0' }]}>
            <Ionicons name="scale" size={28} color="#f57c00" />
            <Text style={styles.statValue}>{weighbridge.length}</Text>
            <Text style={styles.statLabel}>Weighbridge</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#e8f5e9' }]}>
            <Ionicons name="cart" size={28} color="#43a047" />
            <Text style={styles.statValue}>{stats?.total_purchase_orders || 0}</Text>
            <Text style={styles.statLabel}>Purchase Orders</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#f3e5f5' }]}>
            <Ionicons name="cube" size={28} color="#8e24aa" />
            <Text style={styles.statValue}>{stats?.total_sales_orders || 0}</Text>
            <Text style={styles.statLabel}>Sales Orders</Text>
          </View>
        </View>
      </View>

      {/* Recent Gate Entries */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Gate Entries</Text>
        {gateEntries.slice(0, 5).map((entry: any) => (
          <View key={entry._id} style={styles.reportCard}>
            <View style={styles.reportCardHeader}>
              <Text style={styles.reportCardTitle}>{entry.vehicle_number}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(entry.status) }]}>
                <Text style={styles.statusText}>{entry.status}</Text>
              </View>
            </View>
            <Text style={styles.reportCardDetail}>Material: {entry.material_type}</Text>
            <Text style={styles.reportCardDetail}>Supplier: {entry.supplier}</Text>
            <Text style={styles.reportCardDate}>
              {format(new Date(entry.entry_date), 'dd MMM yyyy, hh:mm a')}
            </Text>
          </View>
        ))}
      </View>

      {/* Material Yield Report */}
      {yields.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Material Yield Analysis</Text>
          <View style={styles.yieldCard}>
            <Ionicons name="trending-up" size={32} color="#4caf50" />
            <View style={styles.yieldInfo}>
              <Text style={styles.yieldValue}>{stats?.average_yield?.toFixed(2) || 0}%</Text>
              <Text style={styles.yieldLabel}>Average Yield</Text>
            </View>
          </View>
          {yields.slice(0, 3).map((yieldItem: any) => (
            <View key={yieldItem._id} style={styles.reportCard}>
              <Text style={styles.reportCardTitle}>
                {yieldItem.input_material} → {yieldItem.output_material}
              </Text>
              <View style={styles.yieldDetails}>
                <Text style={styles.reportCardDetail}>
                  Input: {yieldItem.input_quantity} kg
                </Text>
                <Text style={styles.reportCardDetail}>
                  Output: {yieldItem.output_quantity} kg
                </Text>
                <Text style={[styles.reportCardDetail, { color: '#4caf50', fontWeight: 'bold' }]}>
                  Yield: {yieldItem.yield_percentage}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Export Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export Reports</Text>
        <TouchableOpacity style={styles.exportButton}>
          <Ionicons name="download" size={24} color="#ffffff" />
          <Text style={styles.exportButtonText}>Export to PDF (Coming Soon)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.exportButton, { backgroundColor: '#43a047' }]}>
          <Ionicons name="document" size={24} color="#ffffff" />
          <Text style={styles.exportButtonText}>Export to Excel (Coming Soon)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'entered':
      return '#2196f3';
    case 'weighed':
      return '#ff9800';
    case 'inspected':
      return '#9c27b0';
    case 'completed':
      return '#4caf50';
    default:
      return '#757575';
  }
};

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
    paddingTop: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#263238',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#546e7a',
    marginTop: 4,
    textAlign: 'center',
  },
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#263238',
  },
  reportCardDetail: {
    fontSize: 14,
    color: '#546e7a',
    marginTop: 4,
  },
  reportCardDate: {
    fontSize: 12,
    color: '#9e9e9e',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  yieldCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  yieldInfo: {
    marginLeft: 16,
  },
  yieldValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  yieldLabel: {
    fontSize: 14,
    color: '#558b2f',
    marginTop: 4,
  },
  yieldDetails: {
    marginTop: 8,
  },
  exportButton: {
    backgroundColor: '#1e88e5',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  exportButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
