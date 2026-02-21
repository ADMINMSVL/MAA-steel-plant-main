import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function CreateWeighbridge() {
  const router = useRouter();
  const { user } = useAuth();
  const [gateEntries, setGateEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [weight1, setWeight1] = useState('');
  const [weight2, setWeight2] = useState('');
  const [weight3, setWeight3] = useState('');
  const [weight4, setWeight4] = useState('');
  const [grossWeight, setGrossWeight] = useState('');
  const [tareWeight, setTareWeight] = useState('');
  const [netWeight, setNetWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(true);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetchGateEntries();
  }, []);

  const fetchGateEntries = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/gate-entry`);
      const data = await response.json();
      const weighedEntries = data.filter((e: any) => e.status === 'entered');
      setGateEntries(weighedEntries);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoadingEntries(false);
    }
  };

  const calculateNetWeight = () => {
    const gross = parseFloat(grossWeight) || 0;
    const tare = parseFloat(tareWeight) || 0;
    setNetWeight((gross - tare).toString());
  };

  useEffect(() => {
    if (grossWeight && tareWeight) {
      calculateNetWeight();
    }
  }, [grossWeight, tareWeight]);

  const handleSubmit = async () => {
    if (!selectedEntry) {
      if (Platform.OS === 'web') {
        alert('Please select a gate entry');
      } else {
        Alert.alert('Error', 'Please select a gate entry');
      }
      return;
    }

    if (!grossWeight || !tareWeight) {
      if (Platform.OS === 'web') {
        alert('Please enter Gross Weight and Tare Weight');
      } else {
        Alert.alert('Error', 'Please enter Gross Weight and Tare Weight');
      }
      return;
    }

    if (loading) return;

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/weighbridge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gate_entry_id: selectedEntry._id,
          gross_weight: parseFloat(grossWeight),
          tare_weight: parseFloat(tareWeight),
          net_weight: parseFloat(netWeight),
          weighing_operator_id: user?.id || '',
        }),
      });

      if (!response.ok) throw new Error('Failed');

      if (Platform.OS === 'web') {
        alert(`Weighbridge entry created!\nGross: ${grossWeight}kg\nTare: ${tareWeight}kg\nNet: ${netWeight}kg`);
        router.push('/gate-entry/list');
      } else {
        Alert.alert(
          'Success',
          `Weighbridge entry created!\nGross: ${grossWeight}kg\nTare: ${tareWeight}kg\nNet: ${netWeight}kg`,
          [{ text: 'OK', onPress: () => router.push('/gate-entry/list') }]
        );
      }
    } catch (error) {
      console.error('Error:', error);
      if (Platform.OS === 'web') {
        alert('Failed to create weighbridge entry. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to create weighbridge entry. Please try again.');
      }
      setLoading(false);
    }
  };

  if (loadingEntries) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d32f2f" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weighbridge Entry</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Select Gate Entry</Text>
        {gateEntries.map((entry) => (
          <TouchableOpacity
            key={entry._id}
            style={[
              styles.entryCard,
              selectedEntry?._id === entry._id && styles.entryCardSelected,
            ]}
            onPress={() => setSelectedEntry(entry)}
          >
            <Text style={styles.vehicleText}>{entry.vehicle_number}</Text>
            <Text style={styles.materialText}>{entry.material_type}</Text>
            {selectedEntry?._id === entry._id && (
              <Ionicons name="checkmark-circle" size={24} color="#d32f2f" />
            )}
          </TouchableOpacity>
        ))}

        {selectedEntry && (
          <>
            <Text style={styles.sectionTitle}>Weight Entry</Text>
            <View style={styles.form}>
              <Text style={styles.label}>Gross Weight (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter gross weight"
                value={grossWeight}
                onChangeText={setGrossWeight}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Tare Weight (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter tare weight"
                value={tareWeight}
                onChangeText={setTareWeight}
                keyboardType="numeric"
              />

              {netWeight && (
                <View style={styles.netWeightCard}>
                  <Text style={styles.netWeightLabel}>Net Weight</Text>
                  <Text style={styles.netWeightValue}>{netWeight} kg</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="save" size={24} color="#ffffff" />
                )}
                <Text style={styles.submitButtonText}>
                  {loading ? 'Saving...' : 'Save Weighbridge Entry'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#d32f2f',
    padding: 16,
    paddingTop: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { padding: 8 },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 16,
  },
  content: { padding: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#263238',
    marginTop: 16,
    marginBottom: 12,
  },
  entryCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  entryCardSelected: {
    borderWidth: 2,
    borderColor: '#d32f2f',
  },
  vehicleText: { fontSize: 16, fontWeight: 'bold', color: '#263238' },
  materialText: { fontSize: 14, color: '#78909c', marginTop: 4 },
  form: { marginTop: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  netWeightCard: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  netWeightLabel: { fontSize: 14, color: '#2e7d32', marginBottom: 4 },
  netWeightValue: { fontSize: 24, fontWeight: 'bold', color: '#1b5e20' },
  submitButton: {
    backgroundColor: '#d32f2f',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});
