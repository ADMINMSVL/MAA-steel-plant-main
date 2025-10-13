import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function PurchaseOrders() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Form fields
  const [poNumber, setPoNumber] = useState('');
  const [vendor, setVendor] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [rate, setRate] = useState('');

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
  
  // Check if user has admin or manager role
  const canDelete = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/purchase-order`);
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!poNumber || !vendor || !materialType || !quantity || !rate) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/purchase-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_number: poNumber,
          vendor,
          material_type: materialType,
          quantity: parseFloat(quantity),
          unit,
          rate: parseFloat(rate),
          created_by: user?.id || '',
        }),
      });

      if (!response.ok) throw new Error('Failed to create PO');

      Alert.alert('Success', 'Purchase Order created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchOrders();
    } catch (error) {
      Alert.alert('Error', 'Failed to create purchase order');
    }
  };

  const resetForm = () => {
    setPoNumber('');
    setVendor('');
    setMaterialType('');
    setQuantity('');
    setRate('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ff9800';
      case 'received': return '#4caf50';
      case 'cancelled': return '#f44336';
      default: return '#757575';
    }
  };

  const handleDelete = async (id: string, poNumber: string) => {
    Alert.alert(
      'Delete Purchase Order',
      `Are you sure you want to delete ${poNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/purchase-order/${id}`, {
                method: 'DELETE',
              });
              if (!response.ok) throw new Error('Failed to delete');
              Alert.alert('Success', 'Purchase order deleted successfully');
              fetchOrders();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete purchase order');
            }
          },
        },
      ]
    );
  };

  const renderOrder = ({ item }: any) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.poNumber}>{item.po_number}</Text>
        <View style={styles.orderHeaderRight}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
          {canDelete && (
            <TouchableOpacity onPress={() => handleDelete(item._id, item.po_number)}>
              <Ionicons name="trash" size={20} color="#f44336" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <View style={styles.orderBody}>
        <Text style={styles.orderLabel}>Vendor: <Text style={styles.orderValue}>{item.vendor}</Text></Text>
        <Text style={styles.orderLabel}>Material: <Text style={styles.orderValue}>{item.material_type}</Text></Text>
        <Text style={styles.orderLabel}>Quantity: <Text style={styles.orderValue}>{item.quantity} {item.unit}</Text></Text>
        <Text style={styles.orderLabel}>Rate: <Text style={styles.orderValue}>₹{item.rate}/kg</Text></Text>
        <Text style={styles.orderAmount}>Total: ₹{item.total_amount.toLocaleString()}</Text>
        <Text style={styles.orderDate}>{format(new Date(item.order_date), 'dd MMM yyyy')}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Purchase Orders</Text>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item: any) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={64} color="#9e9e9e" />
            <Text style={styles.emptyText}>No purchase orders yet</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)}>
        <Ionicons name="add" size={32} color="#ffffff" />
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Purchase Order</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={28} color="#263238" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>PO Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., PO-001"
                value={poNumber}
                onChangeText={setPoNumber}
              />

              <Text style={styles.label}>Vendor *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter vendor name"
                value={vendor}
                onChangeText={setVendor}
              />

              <Text style={styles.label}>Material Type *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Steel Scrap, Iron Ore"
                value={materialType}
                onChangeText={setMaterialType}
              />

              <Text style={styles.label}>Quantity *</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Rate (₹/kg) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={rate}
                onChangeText={setRate}
                keyboardType="numeric"
              />

              {quantity && rate && (
                <View style={styles.totalCard}>
                  <Text style={styles.totalLabel}>Total Amount:</Text>
                  <Text style={styles.totalValue}>
                    ₹{(parseFloat(quantity) * parseFloat(rate)).toLocaleString()}
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
                <Text style={styles.createButtonText}>Create Purchase Order</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
  orderCard: {
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  poNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#263238',
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
  orderBody: {
    gap: 6,
  },
  orderLabel: {
    fontSize: 14,
    color: '#546e7a',
  },
  orderValue: {
    fontWeight: '600',
    color: '#263238',
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4caf50',
    marginTop: 8,
  },
  orderDate: {
    fontSize: 12,
    color: '#9e9e9e',
    marginTop: 4,
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#263238',
  },
  modalForm: {
    padding: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  totalCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1b5e20',
  },
  createButton: {
    backgroundColor: '#4caf50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
