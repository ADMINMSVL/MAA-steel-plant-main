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
  ActivityIndicator,
  Linking,
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
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      // Fetch only active POs (pending or partial)
      const response = await fetch(`${BACKEND_URL}/api/purchase-order/active`);
      const data = await response.json();
      setPurchaseOrders(data);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      // Fallback to all pending POs
      try {
        const response = await fetch(`${BACKEND_URL}/api/purchase-order`);
        const data = await response.json();
        const pendingPOs = data.filter((po: any) => po.status === 'pending' || po.status === 'partial');
        setPurchaseOrders(pendingPOs);
      } catch (e) {
        console.error('Error fetching purchase orders:', e);
      }
    }
  };

  // When PO is selected, auto-populate supplier and material
  const handlePOSelect = (po: any) => {
    setSelectedPO(po);
    setSupplier(po.vendor || '');
    setMaterialType(po.material_type || '');
  };

  // Call driver when phone number is tapped
  const handleCallDriver = () => {
    if (driverPhone) {
      Linking.openURL(`tel:${driverPhone}`);
    }
  };

  const handleSubmit = async () => {
    if (!vehicleNumber || !driverName || !driverPhone) {
      Alert.alert('Error', 'Please fill Vehicle Number, Driver Name and Driver Phone');
      return;
    }

    if (loading) return;

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/gate-entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_number: vehicleNumber,
          driver_name: driverName,
          driver_phone: driverPhone,
          material_type: materialType || null,
          supplier: supplier || null,
          party_weight: partyWeight ? parseFloat(partyWeight) : null,
          purchase_order_id: selectedPO?._id || null,
          operator_id: user?.id || '',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create entry');
      }

      const data = await response.json();
      
      Alert.alert(
        'Success', 
        `Gate entry ${data.entry_number || ''} created for ${vehicleNumber}`,
        [{ text: 'OK', onPress: () => router.push('/(tabs)') }]
      );
      
      setTimeout(() => router.push('/(tabs)'), 1500);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to create gate entry. Please try again.');
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
          <TouchableOpacity onPress={() => router.push('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gate Entry</Text>
        </View>

        <View style={styles.form}>
          {/* Step 1: Select PO First */}
          <Text style={styles.sectionTitle}>Step 1: Select Purchase Order</Text>
          
          {purchaseOrders.length > 0 ? (
            <View style={styles.poContainer}>
              {purchaseOrders.map((po: any) => (
                <TouchableOpacity
                  key={po._id}
                  style={[
                    styles.poCard,
                    selectedPO?._id === po._id && styles.poCardSelected,
                  ]}
                  onPress={() => handlePOSelect(po)}
                >
                  <View style={styles.poCardContent}>
                    <Text style={styles.poNumber}>{po.po_number}</Text>
                    <Text style={styles.poVendor}>{po.vendor}</Text>
                    <Text style={styles.poMaterial}>{po.material_type} | Rate: ₹{po.rate}/kg</Text>
                    <Text style={styles.poQty}>Qty: {po.quantity} {po.unit}</Text>
                  </View>
                  {selectedPO?._id === po._id && (
                    <Ionicons name="checkmark-circle" size={28} color="#4caf50" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noPOCard}>
              <Ionicons name="information-circle" size={24} color="#9e9e9e" />
              <Text style={styles.noPOText}>No active purchase orders</Text>
            </View>
          )}

          {/* Auto-populated from PO */}
          {selectedPO && (
            <View style={styles.autoFilledSection}>
              <Text style={styles.autoFilledLabel}>Auto-filled from PO:</Text>
              <View style={styles.autoFilledCard}>
                <Text style={styles.autoFilledText}>Supplier: {supplier}</Text>
                <Text style={styles.autoFilledText}>Material: {materialType}</Text>
                <Text style={styles.autoFilledText}>Rate: ₹{selectedPO.rate}/kg</Text>
              </View>
            </View>
          )}

          {/* Step 2: Enter Vehicle & Driver Details */}
          <Text style={styles.sectionTitle}>Step 2: Vehicle & Driver Details</Text>

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

          <Text style={styles.label}>Driver Phone * (Tap to Call)</Text>
          <TouchableOpacity onPress={handleCallDriver} activeOpacity={0.7}>
            <View style={styles.phoneInputContainer}>
              <TextInput
                style={styles.phoneInput}
                placeholder="Enter phone number"
                value={driverPhone}
                onChangeText={setDriverPhone}
                keyboardType="phone-pad"
              />
              {driverPhone && (
                <TouchableOpacity onPress={handleCallDriver} style={styles.callButton}>
                  <Ionicons name="call" size={24} color="#4caf50" />
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.label}>Party Weight (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter party declared weight"
            value={partyWeight}
            onChangeText={setPartyWeight}
            keyboardType="numeric"
          />

          {/* Manual entry if no PO selected */}
          {!selectedPO && (
            <>
              <Text style={styles.label}>Supplier (if no PO)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter supplier name"
                value={supplier}
                onChangeText={setSupplier}
              />

              <Text style={styles.label}>Material Type (if no PO)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., MS Scrap, Iron Ore"
                value={materialType}
                onChangeText={setMaterialType}
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
            )}
            <Text style={styles.submitButtonText}>
              {loading ? 'Creating Entry...' : 'Create Entry'}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0d47a1',
    marginTop: 16,
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#0d47a1',
    paddingBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  phoneInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  callButton: {
    padding: 12,
    backgroundColor: '#e8f5e9',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  submitButton: {
    backgroundColor: '#4caf50',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 32,
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
  poContainer: {
    marginBottom: 16,
  },
  poCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  poCardSelected: {
    borderColor: '#4caf50',
    backgroundColor: '#e8f5e9',
  },
  poCardContent: {
    flex: 1,
  },
  poNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0d47a1',
  },
  poVendor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    marginTop: 4,
  },
  poMaterial: {
    fontSize: 14,
    color: '#546e7a',
    marginTop: 4,
  },
  poQty: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '600',
    marginTop: 4,
  },
  noPOCard: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  noPOText: {
    fontSize: 14,
    color: '#e65100',
    marginLeft: 8,
  },
  autoFilledSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  autoFilledLabel: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '600',
    marginBottom: 8,
  },
  autoFilledCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  autoFilledText: {
    fontSize: 14,
    color: '#2e7d32',
    marginBottom: 4,
  },
});
