import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface ProductEntry {
  id: string;
  category: string;
  categoryName: string;
  productName: string;
  weight: string;
  dust: string;
  rate: string;
}

export default function CreateQualityCheck() {
  const router = useRouter();
  const { user } = useAuth();
  const [gateEntries, setGateEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [weighbridgeWeight, setWeighbridgeWeight] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [status, setStatus] = useState('approved');
  const [remarks, setRemarks] = useState('');
  const [unloadingBay, setUnloadingBay] = useState('');
  const [p2pBasePrice, setP2pBasePrice] = useState('');
  
  // Dynamic product entries
  const [productEntries, setProductEntries] = useState<ProductEntry[]>([]);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  // Price differences based on P2P (in rupees, not paise)
  const priceConfig: Record<string, { name: string; difference: number; color: string }> = {
    colour_tin: { name: 'Colour Tin', difference: -12.5, color: '#e91e63' },
    tin: { name: 'Tin', difference: -7, color: '#9c27b0' },
    light: { name: 'Light', difference: -6, color: '#2196f3' },
    kabadi: { name: 'Kabadi', difference: -2.5, color: '#00bcd4' },
    selected: { name: 'Selected', difference: -1, color: '#4caf50' },
    p2p: { name: 'P2P', difference: 0, color: '#ff9800' },
    mill_heavy: { name: 'Mill Heavy', difference: 1, color: '#795548' },
    cast_iron: { name: 'Cast Iron', difference: -1, color: '#455a64' },
    tourning: { name: 'Tourning', difference: 0, color: '#78909c' },
    others: { name: 'Others', difference: 0, color: '#607d8b' },
  };

  useEffect(() => {
    fetchGateEntries();
  }, []);

  const fetchGateEntries = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/gate-entry`);
      const data = await response.json();
      const weighedEntries = data.filter((e: any) => e.status === 'weighed');
      setGateEntries(weighedEntries);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoadingEntries(false);
    }
  };

  // Fetch weighbridge weight when gate entry is selected
  const handleGateEntrySelect = async (entry: any) => {
    setSelectedEntry(entry);
    
    // Fetch weighbridge data for this gate entry
    try {
      const response = await fetch(`${BACKEND_URL}/api/weighbridge/entry/${entry._id}`);
      const weighbridgeData = await response.json();
      if (weighbridgeData && weighbridgeData.net_weight) {
        setWeighbridgeWeight(weighbridgeData.net_weight);
      } else {
        setWeighbridgeWeight(0);
      }
    } catch (error) {
      console.error('Error fetching weighbridge:', error);
      setWeighbridgeWeight(0);
    }
  };

  const calculateRate = (category: string) => {
    const basePrice = parseFloat(p2pBasePrice) || 0;
    if (basePrice === 0) return '';
    return (basePrice + priceConfig[category].difference).toString();
  };

  const addProductEntry = () => {
    const newEntry: ProductEntry = {
      id: Date.now().toString(),
      category: 'colour_tin',
      categoryName: 'Colour Tin',
      productName: '',
      weight: '',
      dust: '',
      rate: calculateRate('colour_tin'),
    };
    setProductEntries([...productEntries, newEntry]);
  };

  const updateProductEntry = (id: string, field: string, value: string) => {
    setProductEntries(prev =>
      prev.map(entry => {
        if (entry.id === id) {
          const updated = { ...entry, [field]: value };
          // Update rate when category changes
          if (field === 'category') {
            updated.rate = calculateRate(value);
            updated.categoryName = priceConfig[value].name;
          }
          return updated;
        }
        return entry;
      })
    );
  };

  const removeProductEntry = (id: string) => {
    setProductEntries(prev => prev.filter(entry => entry.id !== id));
  };

  // Auto-update all rates when P2P base price changes
  useEffect(() => {
    if (p2pBasePrice) {
      setProductEntries(prev =>
        prev.map(entry => ({
          ...entry,
          rate: calculateRate(entry.category),
        }))
      );
    }
  }, [p2pBasePrice]);

  const calculateTotals = () => {
    let totalWeight = 0;
    let totalDust = 0;
    let totalAmount = 0;

    productEntries.forEach(entry => {
      const weight = parseFloat(entry.weight) || 0;
      const dust = parseFloat(entry.dust) || 0;
      const rate = parseFloat(entry.rate) || 0;
      totalWeight += weight;
      totalDust += dust;
      totalAmount += (weight * rate);
    });

    const balanceWeight = weighbridgeWeight - totalWeight;

    return { totalWeight, totalDust, totalAmount, balanceWeight };
  };

  const handleSubmit = async () => {
    if (!selectedEntry) {
      if (Platform.OS === 'web') {
        alert('Please select a gate entry');
      } else {
        Alert.alert('Error', 'Please select a gate entry');
      }
      return;
    }

    if (productEntries.length === 0) {
      if (Platform.OS === 'web') {
        alert('Please add at least one product entry');
      } else {
        Alert.alert('Error', 'Please add at least one product entry');
      }
      return;
    }

    // Prevent multiple submissions
    if (loading) {
      return;
    }

    setLoading(true);
    try {
      // Group entries by category
      const groupedData: any = {};
      
      productEntries.forEach(entry => {
        if (!groupedData[entry.category]) {
          groupedData[entry.category] = {
            weight: 0,
            rate: parseFloat(entry.rate) || 0,
            dust: 0,
            product_name: entry.category === 'others' ? entry.productName : null,
          };
        }
        groupedData[entry.category].weight += parseFloat(entry.weight) || 0;
        groupedData[entry.category].dust += parseFloat(entry.dust) || 0;
      });

      const qualityData: any = {
        gate_entry_id: selectedEntry._id,
        status,
        remarks,
        unloading_bay: unloadingBay,
        inspector_id: user?.id || '',
        ...groupedData,
      };

      const response = await fetch(`${BACKEND_URL}/api/quality-inspection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(qualityData),
      });

      if (!response.ok) {
        throw new Error('Failed to create quality inspection');
      }

      const data = await response.json();
      const { totalWeight, totalDust, totalAmount, balanceWeight } = calculateTotals();
      
      if (Platform.OS === 'web') {
        alert(`Quality inspection completed!\nTotal Weight: ${totalWeight} kg\nTotal Dust: ${totalDust} kg\nTotal Amount: ₹${totalAmount.toFixed(2)}`);
        router.push('/quality/list');
      } else {
        Alert.alert(
          'Success',
          `Quality inspection completed!\nTotal Weight: ${totalWeight} kg\nTotal Dust: ${totalDust} kg\nTotal Amount: ₹${totalAmount.toFixed(2)}`,
          [
            {
              text: 'Done',
              onPress: () => router.push('/quality/list'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Quality inspection error:', error);
      if (Platform.OS === 'web') {
        alert('Failed to create quality inspection. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to create quality inspection');
      }
      setLoading(false);
    }
  };

  const { totalWeight, totalDust, totalAmount, balanceWeight } = calculateTotals();

  if (loadingEntries) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e88e5" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quality Check</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Select Weighed Entry *</Text>
          {gateEntries.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="information-circle" size={32} color="#9e9e9e" />
              <Text style={styles.emptyText}>No weighed entries available</Text>
            </View>
          ) : (
            <View style={styles.entriesContainer}>
              {gateEntries.map((entry: any) => (
                <TouchableOpacity
                  key={entry._id}
                  style={[
                    styles.entryCard,
                    selectedEntry?._id === entry._id && styles.entryCardSelected,
                  ]}
                  onPress={() => handleGateEntrySelect(entry)}
                >
                  <View style={styles.entryCardLeft}>
                    <Text style={styles.vehicleText}>{entry.vehicle_number}</Text>
                    <Text style={styles.materialText}>{entry.material_type}</Text>
                  </View>
                  {selectedEntry?._id === entry._id && (
                    <Ionicons name="checkmark-circle" size={24} color="#9c27b0" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Weighbridge Weight Display */}
          {weighbridgeWeight > 0 && (
            <View style={styles.weighbridgeInfo}>
              <Ionicons name="scale" size={20} color="#2196f3" />
              <Text style={styles.weighbridgeText}>
                Weighbridge Net Weight: <Text style={styles.weighbridgeValue}>{weighbridgeWeight} kg</Text>
              </Text>
            </View>
          )}

          {/* P2P Base Price */}
          <View style={styles.basePriceCard}>
            <Ionicons name="cash" size={32} color="#ff9800" />
            <View style={styles.basePriceContent}>
              <Text style={styles.basePriceLabel}>P2P Base Price (₹/kg) *</Text>
              <TextInput
                style={styles.basePriceInput}
                placeholder="Enter P2P base price"
                value={p2pBasePrice}
                onChangeText={setP2pBasePrice}
                keyboardType="numeric"
              />
              <Text style={styles.basePriceHint}>All other prices will auto-calculate</Text>
            </View>
          </View>

          {/* Product Entries */}
          <View style={styles.productsSection}>
            <Text style={styles.sectionTitle}>Products & Qualities</Text>
            
            {!p2pBasePrice && (
              <Text style={styles.hintText}>Enter P2P base price first to add products</Text>
            )}

            {productEntries.length === 0 && p2pBasePrice && (
              <TouchableOpacity 
                style={styles.firstAddButton}
                onPress={addProductEntry}
              >
                <Ionicons name="add-circle" size={48} color="#4caf50" />
                <Text style={styles.firstAddButtonText}>Add First Product</Text>
              </TouchableOpacity>
            )}

            {productEntries.map((entry, index) => (
              <React.Fragment key={entry.id}>
              <View style={styles.productCard}>
                <View style={styles.productCardHeader}>
                  <Text style={styles.productCardTitle}>Product #{index + 1}</Text>
                  <TouchableOpacity onPress={() => removeProductEntry(entry.id)}>
                    <Ionicons name="trash" size={24} color="#f44336" />
                  </TouchableOpacity>
                </View>

                {/* Category Selector */}
                <Text style={styles.inputLabel}>Category *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {Object.entries(priceConfig).map(([key, config]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.categoryChip,
                        { borderColor: config.color },
                        entry.category === key && { backgroundColor: config.color },
                      ]}
                      onPress={() => updateProductEntry(entry.id, 'category', key)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          entry.category === key && styles.categoryChipTextActive,
                        ]}
                      >
                        {config.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Product Name for Others */}
                {entry.category === 'others' && (
                  <View style={styles.fieldContainer}>
                    <Text style={styles.inputLabel}>Product Name *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Turning, Sponge Iron"
                      value={entry.productName}
                      onChangeText={(text) => updateProductEntry(entry.id, 'productName', text)}
                    />
                  </View>
                )}

                {/* Weight and Dust */}
                <View style={styles.inputRow}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Weight (kg) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      value={entry.weight}
                      onChangeText={(text) => updateProductEntry(entry.id, 'weight', text)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Dust (kg)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      value={entry.dust}
                      onChangeText={(text) => updateProductEntry(entry.id, 'dust', text)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Rate (Auto-calculated) */}
                <View style={styles.rateCard}>
                  <Text style={styles.rateLabel}>Rate (₹/kg)</Text>
                  <Text style={styles.rateValue}>₹{entry.rate || '0'}</Text>
                  {entry.category !== 'p2p' && entry.category !== 'others' && (
                    <Text style={styles.rateDiff}>
                      ({priceConfig[entry.category].difference > 0 ? '+' : ''}{priceConfig[entry.category].difference})
                    </Text>
                  )}
                </View>

                {/* Amount */}
                {entry.weight && entry.rate && (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Amount:</Text>
                    <Text style={styles.amountValue}>
                      ₹{(parseFloat(entry.weight) * parseFloat(entry.rate)).toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Add button after each product */}
              <TouchableOpacity 
                style={styles.addNextButton}
                onPress={addProductEntry}
              >
                <Ionicons name="add-circle" size={40} color="#4caf50" />
                <Text style={styles.addNextButtonText}>Add Product #{index + 2}</Text>
              </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>

          {/* Totals */}
          {totalWeight > 0 && (
            <View style={styles.totalsCard}>
              <Ionicons name="calculator" size={32} color="#4caf50" />
              <View style={styles.totalsContent}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Weight:</Text>
                  <Text style={styles.totalValue}>{totalWeight.toFixed(2)} kg</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Dust:</Text>
                  <Text style={styles.totalValue}>{totalDust.toFixed(2)} kg</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Amount:</Text>
                  <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Inspection Details */}
          <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Inspection Details</Text>
          
          <Text style={styles.label}>Status *</Text>
          <View style={styles.statusContainer}>
            {['approved', 'conditional', 'rejected'].map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.statusButton,
                  status === s && styles.statusButtonActive,
                  status === s && s === 'approved' && { backgroundColor: '#4caf50' },
                  status === s && s === 'conditional' && { backgroundColor: '#ff9800' },
                  status === s && s === 'rejected' && { backgroundColor: '#f44336' },
                ]}
                onPress={() => setStatus(s)}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    status === s && styles.statusButtonTextActive,
                  ]}
                >
                  {s.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Unloading Bay</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter unloading bay"
            value={unloadingBay}
            onChangeText={setUnloadingBay}
          />

          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Enter remarks (optional)"
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading || !selectedEntry || productEntries.length === 0}
          >
            <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
            <Text style={styles.submitButtonText}>
              {loading ? 'Submitting...' : 'Submit Quality Check'}
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
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    marginBottom: 12,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 16,
  },
  entriesContainer: {
    gap: 12,
    marginBottom: 16,
  },
  entryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  entryCardSelected: {
    borderColor: '#9c27b0',
    backgroundColor: '#f3e5f5',
  },
  entryCardLeft: {
    flex: 1,
  },
  vehicleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#263238',
  },
  materialText: {
    fontSize: 14,
    color: '#78909c',
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9e9e9e',
    marginTop: 8,
  },
  basePriceCard: {
    backgroundColor: '#fff3e0',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#ff9800',
  },
  basePriceContent: {
    flex: 1,
  },
  basePriceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: 8,
  },
  basePriceInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    fontWeight: 'bold',
    borderWidth: 2,
    borderColor: '#ff9800',
  },
  basePriceHint: {
    fontSize: 12,
    color: '#f57c00',
    marginTop: 4,
  },
  productsSection: {
    marginTop: 24,
  },
  productsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  firstAddButton: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4caf50',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  firstAddButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4caf50',
    marginTop: 8,
  },
  addNextButton: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#4caf50',
    borderStyle: 'dashed',
    flexDirection: 'row',
    gap: 12,
  },
  addNextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  hintText: {
    fontSize: 14,
    color: '#9e9e9e',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  productCard: {
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
  productCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  productCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#263238',
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#263238',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  fieldContainer: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    color: '#546e7a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  rateCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rateLabel: {
    fontSize: 14,
    color: '#1565c0',
  },
  rateValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0d47a1',
  },
  rateDiff: {
    fontSize: 12,
    color: '#1976d2',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  amountLabel: {
    fontSize: 14,
    color: '#546e7a',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  totalsCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  totalsContent: {
    flex: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1b5e20',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statusButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  statusButtonActive: {
    borderColor: 'transparent',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#263238',
  },
  statusButtonTextActive: {
    color: '#ffffff',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#9c27b0',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 32,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ce93d8',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
