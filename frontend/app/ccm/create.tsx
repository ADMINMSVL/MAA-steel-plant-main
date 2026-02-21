import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, Alert, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const BILLET_SIZES = ['100x100', '130x130', '150x150', '165x165'];
const QUALITY_GRADES = ['A', 'B', 'C'];
const SHIFTS = ['Morning', 'Afternoon', 'Night'];

export default function CreateBilletProduction() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [heats, setHeats] = useState<any[]>([]);
  
  const [billetBatch, setBilletBatch] = useState('');
  const [heatId, setHeatId] = useState('');
  const [ccmNumber, setCcmNumber] = useState('1');
  const [shift, setShift] = useState(SHIFTS[0]);
  const [billetSize, setBilletSize] = useState(BILLET_SIZES[0]);
  const [billetCount, setBilletCount] = useState('');
  const [totalWeight, setTotalWeight] = useState('');
  const [castingSpeed, setCastingSpeed] = useState('');
  const [castingTemp, setCastingTemp] = useState('');
  const [qualityGrade, setQualityGrade] = useState('');
  const [remarks, setRemarks] = useState('');

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetchHeats();
    generateBatchNumber();
  }, []);

  const fetchHeats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/melting/heat`);
      if (response.ok) {
        const data = await response.json();
        // Only show completed or tapped heats
        setHeats(data.filter((h: any) => h.status === 'tapped' || h.status === 'completed'));
      }
    } catch (error) {
      console.error('Error fetching heats:', error);
    }
  };

  const generateBatchNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setBilletBatch(`BLT-${dateStr}-${random}`);
  };

  const handleSubmit = async () => {
    if (!billetBatch || !billetCount || !totalWeight) {
      const msg = 'Please fill in required fields';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        billet_batch: billetBatch,
        heat_id: heatId || 'direct-charge',
        ccm_number: parseInt(ccmNumber),
        shift: shift.toLowerCase(),
        billet_size: billetSize,
        billet_count: parseInt(billetCount),
        total_weight: parseFloat(totalWeight),
        casting_speed: castingSpeed ? parseFloat(castingSpeed) : null,
        casting_temperature: castingTemp ? parseFloat(castingTemp) : null,
        operator_id: user?.id || 'unknown',
        quality_grade: qualityGrade || null,
        remarks
      };

      const response = await fetch(`${BACKEND_URL}/api/ccm/billet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const msg = 'Billet production recorded!';
        Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);
        router.back();
      } else {
        throw new Error('Failed to record production');
      }
    } catch (error: any) {
      const msg = error.message || 'Failed to record';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Billet Batch</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Batch Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Batch Number *</Text>
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1 }]} value={billetBatch} onChangeText={setBilletBatch} />
            <TouchableOpacity style={styles.refreshBtn} onPress={generateBatchNumber}>
              <Ionicons name="refresh" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Select Heat */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>From Melting Heat</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.heatChip, !heatId && styles.heatChipSelected]}
              onPress={() => setHeatId('')}
            >
              <Text style={[styles.heatChipText, !heatId && styles.heatChipTextSelected]}>Direct Charge</Text>
            </TouchableOpacity>
            {heats.map((heat) => (
              <TouchableOpacity
                key={heat._id}
                style={[styles.heatChip, heatId === heat._id && styles.heatChipSelected]}
                onPress={() => setHeatId(heat._id)}
              >
                <Text style={[styles.heatChipText, heatId === heat._id && styles.heatChipTextSelected]}>
                  {heat.heat_number}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* CCM Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>CCM Machine</Text>
          <View style={styles.optionRow}>
            {['1', '2'].map((num) => (
              <TouchableOpacity
                key={num}
                style={[styles.optionButton, ccmNumber === num && styles.optionSelected]}
                onPress={() => setCcmNumber(num)}
              >
                <Text style={[styles.optionText, ccmNumber === num && styles.optionTextSelected]}>CCM-{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Shift */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Shift</Text>
          <View style={styles.optionRow}>
            {SHIFTS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.optionButton, shift === s && styles.optionSelected]}
                onPress={() => setShift(s)}
              >
                <Text style={[styles.optionText, shift === s && styles.optionTextSelected]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Billet Size */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Billet Size (mm)</Text>
          <View style={styles.optionRow}>
            {BILLET_SIZES.map((size) => (
              <TouchableOpacity
                key={size}
                style={[styles.optionButton, billetSize === size && styles.optionSelected]}
                onPress={() => setBilletSize(size)}
              >
                <Text style={[styles.optionText, billetSize === size && styles.optionTextSelected]}>{size}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Billet Count & Weight */}
        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Billet Count *</Text>
            <TextInput style={styles.input} value={billetCount} onChangeText={setBilletCount} keyboardType="numeric" placeholder="No. of billets" />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Total Weight (kg) *</Text>
            <TextInput style={styles.input} value={totalWeight} onChangeText={setTotalWeight} keyboardType="numeric" placeholder="Weight in kg" />
          </View>
        </View>

        {/* Casting Speed & Temp */}
        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Casting Speed (m/min)</Text>
            <TextInput style={styles.input} value={castingSpeed} onChangeText={setCastingSpeed} keyboardType="numeric" placeholder="Speed" />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Temperature (°C)</Text>
            <TextInput style={styles.input} value={castingTemp} onChangeText={setCastingTemp} keyboardType="numeric" placeholder="Temp" />
          </View>
        </View>

        {/* Quality Grade */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Quality Grade</Text>
          <View style={styles.optionRow}>
            {QUALITY_GRADES.map((grade) => (
              <TouchableOpacity
                key={grade}
                style={[styles.gradeButton, qualityGrade === grade && styles.gradeSelected, { borderColor: grade === 'A' ? '#4caf50' : grade === 'B' ? '#ff9800' : '#f44336' }]}
                onPress={() => setQualityGrade(qualityGrade === grade ? '' : grade)}
              >
                <Text style={[styles.gradeText, qualityGrade === grade && { color: '#fff' }]}>{grade}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Remarks */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Remarks</Text>
          <TextInput style={[styles.input, { height: 80 }]} value={remarks} onChangeText={setRemarks} multiline placeholder="Any defects or notes..." />
        </View>

        <TouchableOpacity style={[styles.submitButton, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
          <Ionicons name="cube" size={24} color="#fff" />
          <Text style={styles.submitText}>{loading ? 'Saving...' : 'Record Production'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#2196f3', padding: 16, paddingTop: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  content: { flex: 1, padding: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#263238', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, fontSize: 16 },
  row: { flexDirection: 'row', gap: 8 },
  refreshBtn: { backgroundColor: '#2196f3', padding: 12, borderRadius: 8, justifyContent: 'center' },
  heatChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', marginRight: 8 },
  heatChipSelected: { backgroundColor: '#2196f3', borderColor: '#2196f3' },
  heatChipText: { fontSize: 13, color: '#78909c' },
  heatChipTextSelected: { color: '#fff', fontWeight: '600' },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optionButton: { flex: 1, minWidth: 70, padding: 12, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, alignItems: 'center', backgroundColor: '#fff' },
  optionSelected: { backgroundColor: '#2196f3', borderColor: '#2196f3' },
  optionText: { fontSize: 13, color: '#263238', fontWeight: '500' },
  optionTextSelected: { color: '#fff' },
  rowInputs: { flexDirection: 'row', gap: 12 },
  gradeButton: { flex: 1, padding: 14, borderWidth: 2, borderRadius: 8, alignItems: 'center', backgroundColor: '#fff' },
  gradeSelected: { backgroundColor: '#4caf50' },
  gradeText: { fontSize: 18, fontWeight: 'bold', color: '#263238' },
  submitButton: { backgroundColor: '#2196f3', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10, marginBottom: 40 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
