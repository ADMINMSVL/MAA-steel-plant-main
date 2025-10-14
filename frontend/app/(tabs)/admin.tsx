import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';

export default function AdminScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [gateEntries, setGateEntries] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [weighbridgeRecords, setWeighbridgeRecords] = useState([]);
  const [qualityInspections, setQualityInspections] = useState([]);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  // Check if user is admin or manager
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'You do not have permission to access this screen.');
      router.back();
      return;
    }
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      // Fetch all data types
      const [gate, po, so, wb, qi] = await Promise.all([
        fetch(`${BACKEND_URL}/api/gate-entry`).then(r => r.json()),
        fetch(`${BACKEND_URL}/api/purchase-order`).then(r => r.json()),
        fetch(`${BACKEND_URL}/api/sales-order`).then(r => r.json()),
        fetch(`${BACKEND_URL}/api/weighbridge`).then(r => r.json()),
        fetch(`${BACKEND_URL}/api/quality-inspection`).then(r => r.json()),
      ]);

      setGateEntries(gate);
      setPurchaseOrders(po);
      setSalesOrders(so);
      setWeighbridgeRecords(wb);
      setQualityInspections(qi);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handleClearAll = async () => {
    const totalEntries = gateEntries.length + purchaseOrders.length + salesOrders.length + 
                        weighbridgeRecords.length + qualityInspections.length;
    
    if (totalEntries === 0) {
      if (Platform.OS === 'web') {
        alert('No data to clear');
      } else {
        Alert.alert('Info', 'No data to clear');
      }
      return;
    }

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `⚠️ DANGER: This will permanently delete ALL ${totalEntries} entries!\n\n` +
        `• ${gateEntries.length} Gate Entries\n` +
        `• ${purchaseOrders.length} Purchase Orders\n` +
        `• ${salesOrders.length} Sales Orders\n` +
        `• ${weighbridgeRecords.length} Weighbridge Records\n` +
        `• ${qualityInspections.length} Quality Inspections\n\n` +
        `This action CANNOT be undone!\n\nAre you absolutely sure?`
      );
      
      if (!confirmed) return;

      const secondConfirm = window.confirm('Final confirmation: Delete ALL data?');
      if (!secondConfirm) return;

      try {
        const response = await fetch(`${BACKEND_URL}/api/admin/clear-all`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Failed to clear data');
        
        alert('All data cleared successfully');
        fetchAllData();
      } catch (error) {
        alert('Failed to clear data');
      }
    } else {
      Alert.alert(
        '⚠️ Clear All Data',
        `This will permanently delete ALL ${totalEntries} entries!\n\n` +
        `• ${gateEntries.length} Gate Entries\n` +
        `• ${purchaseOrders.length} Purchase Orders\n` +
        `• ${salesOrders.length} Sales Orders\n` +
        `• ${weighbridgeRecords.length} Weighbridge Records\n` +
        `• ${qualityInspections.length} Quality Inspections\n\n` +
        `This action CANNOT be undone!`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete All',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Final Confirmation',
                'Are you absolutely sure? This cannot be undone!',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Yes, Delete All',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        const response = await fetch(`${BACKEND_URL}/api/admin/clear-all`, {
                          method: 'DELETE',
                        });

                        if (!response.ok) throw new Error('Failed to clear data');
                        
                        Alert.alert('Success', 'All data cleared successfully');
                        fetchAllData();
                      } catch (error) {
                        Alert.alert('Error', 'Failed to clear data');
                      }
                    },
                  },
                ]
              );
            },
          },
        ]
      );
    }
  };
    // Use window.confirm for web compatibility
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`);
      if (!confirmed) return;
      
      try {
        const endpoint = type === 'gate' ? 'gate-entry' :
                         type === 'po' ? 'purchase-order' :
                         type === 'so' ? 'sales-order' :
                         type === 'wb' ? 'weighbridge' :
                         'quality-inspection';

        const response = await fetch(`${BACKEND_URL}/api/${endpoint}/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Failed to delete');
        
        alert('Entry deleted successfully');
        fetchAllData();
      } catch (error) {
        alert('Failed to delete entry');
      }
    } else {
      // Native Alert for mobile
      Alert.alert(
        'Delete Entry',
        `Are you sure you want to delete ${name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                const endpoint = type === 'gate' ? 'gate-entry' :
                                 type === 'po' ? 'purchase-order' :
                                 type === 'so' ? 'sales-order' :
                                 type === 'wb' ? 'weighbridge' :
                                 'quality-inspection';

                const response = await fetch(`${BACKEND_URL}/api/${endpoint}/${id}`, {
                  method: 'DELETE',
                });

                if (!response.ok) throw new Error('Failed to delete');
                
                Alert.alert('Success', 'Entry deleted successfully');
                fetchAllData();
              } catch (error) {
                Alert.alert('Error', 'Failed to delete entry');
              }
            },
          },
        ]
      );
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d32f2f" />
      </View>
    );
  }

  const renderDataSection = (title: string, data: any[], type: string, icon: string) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={24} color="#d32f2f" />
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{data.length}</Text>
        </View>
      </View>

      {data.length === 0 ? (
        <View style={styles.emptySection}>
          <Text style={styles.emptyText}>No entries</Text>
        </View>
      ) : (
        data.map((item, index) => (
          <View key={item._id || index} style={styles.entryCard}>
            <View style={styles.entryInfo}>
              <Text style={styles.entryTitle}>
                {type === 'gate' ? item.vehicle_number :
                 type === 'po' ? item.po_number :
                 type === 'so' ? item.so_number :
                 type === 'wb' ? `WB-${item._id?.slice(-6)}` :
                 `QI-${item._id?.slice(-6)}`}
              </Text>
              <Text style={styles.entryDate}>
                {format(new Date(item.entry_date || item.order_date || item.weight_date || item.inspection_date), 'dd MMM yyyy, hh:mm a')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(type, item._id, 
                type === 'gate' ? item.vehicle_number :
                type === 'po' ? item.po_number :
                type === 'so' ? item.so_number :
                type === 'wb' ? `Weighbridge-${item._id?.slice(-6)}` :
                `Quality-${item._id?.slice(-6)}`
              )}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash" size={20} color="#d32f2f" />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={28} color="#ffffff" />
        <Text style={styles.headerTitle}>Admin Panel</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.warningBanner}>
          <Ionicons name="warning" size={24} color="#ff6f00" />
          <Text style={styles.warningText}>
            You can delete entries one by one. This action cannot be undone.
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.clearAllButton}
          onPress={handleClearAll}
        >
          <Ionicons name="trash-bin" size={24} color="#ffffff" />
          <Text style={styles.clearAllButtonText}>Clear All Logs</Text>
        </TouchableOpacity>

        {renderDataSection('Gate Entries', gateEntries, 'gate', 'enter')}
        {renderDataSection('Purchase Orders', purchaseOrders, 'po', 'cart')}
        {renderDataSection('Sales Orders', salesOrders, 'so', 'cash')}
        {renderDataSection('Weighbridge Records', weighbridgeRecords, 'wb', 'scale')}
        {renderDataSection('Quality Inspections', qualityInspections, 'qi', 'checkmark-circle')}
      </ScrollView>
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
    backgroundColor: '#d32f2f',
    padding: 24,
    paddingTop: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  warningBanner: {
    backgroundColor: '#fff3e0',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6f00',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#e65100',
    fontWeight: '600',
  },
  section: {
    margin: 16,
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#263238',
    flex: 1,
  },
  badge: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptySection: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9e9e9e',
  },
  clearAllButton: {
    backgroundColor: '#c62828',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  clearAllButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  entryCard: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  entryInfo: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    marginBottom: 4,
  },
  entryDate: {
    fontSize: 12,
    color: '#78909c',
  },
  deleteBtn: {
    padding: 8,
  },
});
