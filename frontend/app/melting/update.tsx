import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, Alert, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function UpdateMeltingHeat() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [heat, setHeat] = useState<any>(null);
  const [moltenWeight, setMoltenWeight] = useState('');
  const [powerConsumption, setPowerConsumption] = useState('');
  const [temperature, setTemperature] = useState('');
  const [status, setStatus] = useState('');
  const [remarks, setRemarks] = useState('');

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetchHeat();
  }, [id]);

  const fetchHeat = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/melting/heat/${id}`);
      if (response.ok) {
        const data = await response.json();
        setHeat(data);
        setMoltenWeight(data.molten_metal_weight?.toString() || '');
        setPowerConsumption(data.power_consumption?.toString() || '');
        setTemperature(data.temperature?.toString() || '');
        setStatus(data.status);
        setRemarks(data.remarks || '');
      }
    } catch (error) {
      console.error('Error fetching heat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const updateData: any = {
        status,
        remarks
      };

      if (moltenWeight) {
        updateData.molten_metal_weight = parseFloat(moltenWeight);
      }
      if (powerConsumption) {
        updateData.power_consumption = parseFloat(powerConsumption);
      }
      if (temperature) {
        updateData.temperature = parseFloat(temperature);
      }
      if (status === 'tapped' || status === 'completed') {
        updateData.end_time = new Date().toISOString();
      }

      const response = await fetch(`${BACKEND_URL}/api/melting/heat/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const result = await response.json();
        const yieldMsg = result.yield_percentage ? `\nYield: ${result.yield_percentage}%` : '';
        const msg = 'Heat updated successfully!' + yieldMsg;
        if (Platform.OS === 'web') {
          alert(msg);
        } else {
          Alert.alert('Success', msg);
        }
        router.back();
      } else {
        throw new Error('Failed to update');
      }
    } catch (error: any) {
      const msg = error.message || 'Failed to update heat';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'charging': return '#ff9800';
      case 'melting': return '#f44336';
      case 'tapped': return '#2196f3';
      case 'completed': return '#4caf50';
      default: return '#78909c';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#ff5722" />
        <Text style={styles.loadingText}>Loading heat data...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Update Heat</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Heat Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Heat Number:</Text>
            <Text style={styles.infoValue}>{heat?.heat_number}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Furnace:</Text>
            <Text style={styles.infoValue}>{heat?.furnace_number}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Shift:</Text>
            <Text style={styles.infoValue}>{heat?.shift}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Charge:</Text>
            <Text style={styles.infoValueHighlight}>{heat?.total_charge_weight} kg</Text>
          </View>
        </View>

        {/* Status Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusContainer}>
            {['charging', 'melting', 'tapped', 'completed'].map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.statusButton,
                  status === s && { backgroundColor: getStatusColor(s), borderColor: getStatusColor(s) }
                ]}
                onPress={() => setStatus(s)}
              >
                <Text style={[styles.statusText, status === s && styles.statusTextSelected]}>
                  {s.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Output Weight */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Molten Metal Weight (kg)</Text>
          <TextInput
            style={styles.input}
            value={moltenWeight}
            onChangeText={setMoltenWeight}
            placeholder="Enter output weight"
            keyboardType="numeric"
          />
          {moltenWeight && heat?.total_charge_weight > 0 && (
            <View style={styles.yieldPreview}>
              <Text style={styles.yieldText}>
                Estimated Yield: {((parseFloat(moltenWeight) / heat.total_charge_weight) * 100).toFixed(2)}%
              </Text>
            </View>
          )}
        </View>

        {/* Power Consumption */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Power Consumption (kWh)</Text>
          <TextInput
            style={styles.input}
            value={powerConsumption}
            onChangeText={setPowerConsumption}
            placeholder="Enter power consumed"
            keyboardType="numeric"
          />
        </View>

        {/* Temperature */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Temperature (°C)</Text>
          <TextInput
            style={styles.input}
            value={temperature}
            onChangeText={setTemperature}
            placeholder="Enter final temperature"
            keyboardType="numeric"
          />
        </View>

        {/* Remarks */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={[styles.input, styles.remarksInput]}
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Any observations..."
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitButton, saving && styles.submitDisabled]} 
          onPress={handleUpdate}
          disabled={saving}
        >
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.submitText}>{saving ? 'Saving...' : 'Update Heat'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#ff5722', padding: 16, paddingTop: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  content: { flex: 1, padding: 16 },
  loadingText: { marginTop: 12, color: '#78909c' },
  infoCard: { backgroundColor: '#fff3e0', borderRadius: 12, padding: 16, marginBottom: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#ffe0b2' },
  infoLabel: { fontSize: 14, color: '#78909c' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#263238' },
  infoValueHighlight: { fontSize: 16, fontWeight: 'bold', color: '#e65100' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#263238', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 14, fontSize: 16 },
  statusContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: { flex: 1, minWidth: '45%', padding: 12, borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 8, alignItems: 'center', backgroundColor: '#fff' },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#78909c' },
  statusTextSelected: { color: '#fff' },
  yieldPreview: { backgroundColor: '#e8f5e9', padding: 10, borderRadius: 6, marginTop: 8 },
  yieldText: { color: '#2e7d32', fontWeight: '600', textAlign: 'center' },
  remarksInput: { height: 80, textAlignVertical: 'top' },
  submitButton: { backgroundColor: '#4caf50', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10, marginBottom: 40 },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
