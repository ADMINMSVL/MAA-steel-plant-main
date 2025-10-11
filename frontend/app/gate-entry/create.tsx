import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function CreateGateEntry() {
  const router = useRouter();
  const { user } = useAuth();
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [supplier, setSupplier] = useState('');
  const [partyWeight, setPartyWeight] = useState('');
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/purchase-order`);
      const data = await response.json();
      const pendingPOs = data.filter((po: any) => po.status === 'pending');
      setPurchaseOrders(pendingPOs);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    }
  };

  const handleSubmit = async () => {
    if (!vehicleNumber || !driverName || !driverPhone || !materialType || !supplier) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/gate-entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_number: vehicleNumber,
          driver_name: driverName,
          driver_phone: driverPhone,
          material_type: materialType,
          supplier: supplier,
          party_weight: partyWeight ? parseFloat(partyWeight) : null,
          purchase_order_id: selectedPO?._id || null,
          operator_id: user?.id || '',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create entry');
      }

      const data = await response.json();
      Alert.alert('Success', 'Gate entry created successfully', [
        {
          text: 'View Entries',
          onPress: () => router.push('/gate-entry/list'),
        },
        {
          text: 'Create Another',
          onPress: () => {
            setVehicleNumber('');
            setDriverName('');
            setDriverPhone('');
            setMaterialType('');
            setSupplier('');
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create gate entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gate Entry</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Vehicle Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., MH12AB1234"
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Driver Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter driver name"
            value={driverName}
            onChangeText={setDriverName}
          />

          <Text style={styles.label}>Driver Phone *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter phone number"
            value={driverPhone}
            onChangeText={setDriverPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Material Type *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Iron Ore, Coal, Steel"
            value={materialType}
            onChangeText={setMaterialType}
          />

          <Text style={styles.label}>Supplier *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter supplier name"
            value={supplier}
            onChangeText={setSupplier}
          />

          <Text style={styles.label}>Party Weight (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter party weight (optional)"
            value={partyWeight}
            onChangeText={setPartyWeight}
            keyboardType="numeric"
          />

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
            <Text style={styles.submitButtonText}>
              {loading ? 'Creating...' : 'Create Entry'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
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
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  submitButton: {
    backgroundColor: '#4caf50',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
