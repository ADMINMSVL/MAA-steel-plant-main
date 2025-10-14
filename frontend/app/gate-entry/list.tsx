import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

export default function GateEntryList() {
  const router = useRouter();
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
  
  // Check if user has admin or manager role
  const canDelete = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/gate-entry`);
      const data = await response.json();
      setEntries(data);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEntries();
  };

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

  const handleDelete = async (id: string, vehicleNumber: string) => {
    Alert.alert(
      'Delete Entry',
      `Are you sure you want to delete ${vehicleNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/gate-entry/${id}`, {
                method: 'DELETE',
              });
              if (!response.ok) throw new Error('Failed to delete');
              Alert.alert('Success', 'Entry deleted successfully');
              fetchEntries();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ]
    );
  };

  const renderEntry = ({ item }: any) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.vehicleNumber}>{item.vehicle_number}</Text>
          <Text style={styles.materialType}>{item.material_type}</Text>
        </View>
        <View style={styles.cardHeaderRight}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
          {canDelete && (
            <TouchableOpacity
              onPress={() => handleDelete(item._id, item.vehicle_number)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash" size={20} color="#f44336" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Ionicons name="person" size={16} color="#546e7a" />
          <Text style={styles.info}>{item.driver_name}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="call" size={16} color="#546e7a" />
          <Text style={styles.info}>{item.driver_phone}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="business" size={16} color="#546e7a" />
          <Text style={styles.info}>{item.supplier}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="time" size={16} color="#546e7a" />
          <Text style={styles.info}>
            {format(new Date(item.entry_date), 'dd MMM yyyy, hh:mm a')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e88e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gate Entries</Text>
      </View>

      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item: any) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={64} color="#9e9e9e" />
            <Text style={styles.emptyText}>No gate entries yet</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/gate-entry/create')}
      >
        <Ionicons name="add" size={32} color="#ffffff" />
      </TouchableOpacity>
    </View>
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
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 4,
  },
  vehicleNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#263238',
  },
  materialType: {
    fontSize: 14,
    color: '#78909c',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardBody: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  info: {
    fontSize: 14,
    color: '#546e7a',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9e9e9e',
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4caf50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
