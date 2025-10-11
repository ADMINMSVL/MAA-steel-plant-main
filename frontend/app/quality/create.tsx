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

interface CategoryData {
  weight: string;
  rate: string;
}

export default function CreateQualityCheck() {
  const router = useRouter();
  const { user } = useAuth();
  const [gateEntries, setGateEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [status, setStatus] = useState('approved');
  const [remarks, setRemarks] = useState('');
  const [unloadingBay, setUnloadingBay] = useState('');

  const [colourTin, setColourTin] = useState<CategoryData>({ weight: '', rate: '' });
  const [tin, setTin] = useState<CategoryData>({ weight: '', rate: '' });
  const [light, setLight] = useState<CategoryData>({ weight: '', rate: '' });
  const [kabadi, setKabadi] = useState<CategoryData>({ weight: '', rate: '' });
  const [selected, setSelected] = useState<CategoryData>({ weight: '', rate: '' });
  const [p2p, setP2p] = useState<CategoryData>({ weight: '', rate: '' });
  const [millHeavy, setMillHeavy] = useState<CategoryData>({ weight: '', rate: '' });
  const [others, setOthers] = useState<CategoryData>({ weight: '', rate: '' });

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const categories = [
    { name: 'Colour Tin', key: 'colour_tin', state: colourTin, setState: setColourTin, color: '#e91e63' },
    { name: 'Tin', key: 'tin', state: tin, setState: setTin, color: '#9c27b0' },
    { name: 'Light', key: 'light', state: light, setState: setLight, color: '#2196f3' },
    { name: 'Kabadi', key: 'kabadi', state: kabadi, setState: setKabadi, color: '#00bcd4' },
    { name: 'Selected', key: 'selected', state: selected, setState: setSelected, color: '#4caf50' },
    { name: 'P2P', key: 'p2p', state: p2p, setState: setP2p, color: '#ff9800' },
    { name: 'Mill Heavy', key: 'mill_heavy', state: millHeavy, setState: setMillHeavy, color: '#795548' },
    { name: 'Others', key: 'others', state: others, setState: setOthers, color: '#607d8b' },
  ];

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

  const calculateTotals = () => {
    let totalWeight = 0;
    let totalAmount = 0;

    categories.forEach(cat => {
      const weight = parseFloat(cat.state.weight) || 0;
      const rate = parseFloat(cat.state.rate) || 0;
      totalWeight += weight;
      totalAmount += (weight * rate);
    });

    return { totalWeight, totalAmount };
  };

  const handleSubmit = async () => {
    if (!selectedEntry) {
      Alert.alert('Error', 'Please select a gate entry');
      return;
    }

    const { totalWeight, totalAmount } = calculateTotals();

    if (totalWeight === 0) {
      Alert.alert('Error', 'Please enter at least one quality category with weight');
      return;
    }

    setLoading(true);
    try {
      const qualityData: any = {
        gate_entry_id: selectedEntry._id,
        status,
        remarks,
        unloading_bay: unloadingBay,
        inspector_id: user?.id || '',
      };

      categories.forEach(cat => {
        if (cat.state.weight || cat.state.rate) {
          qualityData[cat.key] = {
            weight: parseFloat(cat.state.weight) || null,
            rate: parseFloat(cat.state.rate) || null,
          };
        }
      });

      const response = await fetch(`${BACKEND_URL}/api/quality-inspection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(qualityData),
      });

      if (!response.ok) {
        throw new Error('Failed to create quality inspection');
      }

      const data = await response.json();
      
      Alert.alert(
        'Success',
        `Quality inspection completed!\nTotal Weight: ${data.total_weight} kg\nTotal Amount: ₹${data.total_amount.toFixed(2)}`,
        [
          {
            text: 'Done',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create quality inspection');
    } finally {
      setLoading(false);
    }
  };

  const { totalWeight, totalAmount } = calculateTotals();

  if (loadingEntries) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e88e5" />
      </View>
    );
  }

  return (
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
                onPress={() => setSelectedEntry(entry)}
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

        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Quality Bifurcation</Text>
        <Text style={styles.subtitle}>Enter weight (kg) and rate (₹/kg) for each category</Text>

        {categories.map((cat, index) => (
          <View key={index} style={[styles.categoryCard, { borderLeftColor: cat.color }]}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryName}>{cat.name}</Text>
              <Text style={[styles.categoryLetter, { color: cat.color }]}>
                {String.fromCharCode(97 + index).toUpperCase()}
              </Text>
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={cat.state.weight}
                  onChangeText={(text) => cat.setState({ ...cat.state, weight: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Rate (₹/kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={cat.state.rate}
                  onChangeText={(text) => cat.setState({ ...cat.state, rate: text })}
                  keyboardType="numeric"
                />
              </View>
            </View>
            {cat.state.weight && cat.state.rate && (
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Amount:</Text>
                <Text style={styles.amountValue}>
                  ₹{(parseFloat(cat.state.weight) * parseFloat(cat.state.rate)).toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        ))}

        {totalWeight > 0 && (
          <View style={styles.totalsCard}>
            <Ionicons name="calculator" size={32} color="#4caf50" />
            <View style={styles.totalsContent}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Weight:</Text>
                <Text style={styles.totalValue}>{totalWeight.toFixed(2)} kg</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount:</Text>
                <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}

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
          disabled={loading || !selectedEntry || totalWeight === 0}
        >
          <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit Quality Check'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#78909c',
    marginBottom: 16,
  },
  entriesContainer: {
    gap: 12,
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
  },
  emptyText: {
    fontSize: 14,
    color: '#9e9e9e',
    marginTop: 8,
  },
  categoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#263238',
  },
  categoryLetter: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
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
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
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
    fontSize: 20,
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
