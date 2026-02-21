import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, Alert, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

interface RawMaterial {
  material_type: string;
  weight: string;
}

const MATERIAL_TYPES = [
  'MS Heavy Scrap',
  'MS Light Scrap', 
  'Pig Iron',
  'Cast Iron',
  'Tourning',
  'Sponge Iron',
  'DRI',
  'Others'
];

const SHIFTS = ['Morning (6AM-2PM)', 'Afternoon (2PM-10PM)', 'Night (10PM-6AM)'];

export default function CreateMeltingHeat() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [heatNumber, setHeatNumber] = useState('');
  const [furnaceNumber, setFurnaceNumber] = useState('1');
  const [shift, setShift] = useState(SHIFTS[0]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([{ material_type: MATERIAL_TYPES[0], weight: '' }]);
  const [remarks, setRemarks] = useState('');

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const addMaterial = () => {
    setRawMaterials([...rawMaterials, { material_type: MATERIAL_TYPES[0], weight: '' }]);
  };

  const removeMaterial = (index: number) => {
    if (rawMaterials.length > 1) {
      setRawMaterials(rawMaterials.filter((_, i) => i !== index));
    }
  };

  const updateMaterial = (index: number, field: keyof RawMaterial, value: string) => {
    const updated = [...rawMaterials];
    updated[index][field] = value;
    setRawMaterials(updated);
  };

  const getTotalCharge = () => {
    return rawMaterials.reduce((sum, m) => sum + (parseFloat(m.weight) || 0), 0);
  };

  const generateHeatNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setHeatNumber(`H-${dateStr}-${random}`);
  };

  const handleSubmit = async () => {
    if (!heatNumber) {
      const msg = 'Please enter or generate a heat number';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
      return;
    }

    const validMaterials = rawMaterials.filter(m => m.weight && parseFloat(m.weight) > 0);
    if (validMaterials.length === 0) {
      const msg = 'Please add at least one raw material with weight';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        heat_number: heatNumber,
        furnace_number: parseInt(furnaceNumber),
        shift: shift.split(' ')[0].toLowerCase(),
        raw_materials: validMaterials.map(m => ({
          material_type: m.material_type,
          weight: parseFloat(m.weight)
        })),
        operator_id: user?.id || 'unknown',
        remarks
      };

      const response = await fetch(`${BACKEND_URL}/api/melting/heat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const msg = 'Heat created successfully!';
        if (Platform.OS === 'web') {
          alert(msg);
        } else {
          Alert.alert('Success', msg);
        }
        router.back();
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create heat');
      }
    } catch (error: any) {
      const msg = error.message || 'Failed to create heat';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Melting Heat</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Heat Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Heat Number *</Text>
          <View style={styles.heatNumberRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={heatNumber}
              onChangeText={setHeatNumber}
              placeholder="Enter or generate heat number"
            />
            <TouchableOpacity style={styles.generateBtn} onPress={generateHeatNumber}>
              <Ionicons name="refresh" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Furnace Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Furnace Number</Text>
          <View style={styles.optionRow}>
            {['1', '2', '3'].map((num) => (
              <TouchableOpacity
                key={num}
                style={[styles.optionButton, furnaceNumber === num && styles.optionSelected]}
                onPress={() => setFurnaceNumber(num)}
              >
                <Text style={[styles.optionText, furnaceNumber === num && styles.optionTextSelected]}>
                  Furnace {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Shift */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Shift</Text>
          <View style={styles.shiftContainer}>
            {SHIFTS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.shiftButton, shift === s && styles.shiftSelected]}
                onPress={() => setShift(s)}
              >
                <Text style={[styles.shiftText, shift === s && styles.shiftTextSelected]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Raw Materials */}
        <View style={styles.inputGroup}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Raw Materials *</Text>
            <TouchableOpacity style={styles.addMaterialBtn} onPress={addMaterial}>
              <Ionicons name="add-circle" size={24} color="#ff5722" />
            </TouchableOpacity>
          </View>
          
          {rawMaterials.map((material, index) => (
            <View key={index} style={styles.materialRow}>
              <View style={styles.materialTypeContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {MATERIAL_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.materialTypeChip,
                        material.material_type === type && styles.materialTypeSelected
                      ]}
                      onPress={() => updateMaterial(index, 'material_type', type)}
                    >
                      <Text style={[
                        styles.materialTypeText,
                        material.material_type === type && styles.materialTypeTextSelected
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.weightRow}>
                <TextInput
                  style={[styles.input, styles.weightInput]}
                  value={material.weight}
                  onChangeText={(val) => updateMaterial(index, 'weight', val)}
                  placeholder="Weight (kg)"
                  keyboardType="numeric"
                />
                {rawMaterials.length > 1 && (
                  <TouchableOpacity onPress={() => removeMaterial(index)} style={styles.removeBtn}>
                    <Ionicons name="close-circle" size={24} color="#f44336" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          <View style={styles.totalCharge}>
            <Text style={styles.totalLabel}>Total Charge:</Text>
            <Text style={styles.totalValue}>{getTotalCharge().toFixed(0)} kg</Text>
          </View>
        </View>

        {/* Remarks */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={[styles.input, styles.remarksInput]}
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Any special notes..."
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitDisabled]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          <Ionicons name="flame" size={24} color="#fff" />
          <Text style={styles.submitText}>{loading ? 'Creating...' : 'Start Heat'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#ff5722', padding: 16, paddingTop: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  content: { flex: 1, padding: 16 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#263238', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 14, fontSize: 16 },
  heatNumberRow: { flexDirection: 'row', gap: 8 },
  generateBtn: { backgroundColor: '#ff5722', padding: 14, borderRadius: 8, justifyContent: 'center' },
  optionRow: { flexDirection: 'row', gap: 8 },
  optionButton: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, alignItems: 'center', backgroundColor: '#fff' },
  optionSelected: { backgroundColor: '#ff5722', borderColor: '#ff5722' },
  optionText: { fontSize: 14, color: '#263238', fontWeight: '500' },
  optionTextSelected: { color: '#fff' },
  shiftContainer: { gap: 8 },
  shiftButton: { padding: 14, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, backgroundColor: '#fff' },
  shiftSelected: { backgroundColor: '#ff5722', borderColor: '#ff5722' },
  shiftText: { fontSize: 14, color: '#263238', textAlign: 'center' },
  shiftTextSelected: { color: '#fff', fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addMaterialBtn: { padding: 4 },
  materialRow: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e0e0e0' },
  materialTypeContainer: { marginBottom: 10 },
  materialTypeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f5f5f5', marginRight: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  materialTypeSelected: { backgroundColor: '#fff3e0', borderColor: '#ff5722' },
  materialTypeText: { fontSize: 13, color: '#78909c' },
  materialTypeTextSelected: { color: '#ff5722', fontWeight: '600' },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weightInput: { flex: 1 },
  removeBtn: { padding: 4 },
  totalCharge: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff3e0', padding: 12, borderRadius: 8, marginTop: 8 },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#e65100' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#e65100' },
  remarksInput: { height: 80, textAlignVertical: 'top' },
  submitButton: { backgroundColor: '#ff5722', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10, marginBottom: 40 },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
