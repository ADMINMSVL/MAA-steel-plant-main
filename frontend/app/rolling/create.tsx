import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, Alert, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const TMT_SIZES = ['8mm', '10mm', '12mm', '16mm', '20mm', '25mm', '32mm'];
const SHIFTS = ['Morning', 'Afternoon', 'Night'];

export default function CreateRollingProduction() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [billets, setBillets] = useState<any[]>([]);
  
  const [productionBatch, setProductionBatch] = useState('');
  const [billetBatchId, setBilletBatchId] = useState('');
  const [millNumber, setMillNumber] = useState('1');
  const [shift, setShift] = useState(SHIFTS[0]);
  const [productSize, setProductSize] = useState(TMT_SIZES[2]);
  const [bundleCount, setBundleCount] = useState('');
  const [totalWeight, setTotalWeight] = useState('');
  const [productionRate, setProductionRate] = useState('');
  const [qualityCheck, setQualityCheck] = useState('');
  const [remarks, setRemarks] = useState('');

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetchBillets();
    generateBatchNumber();
  }, []);

  const fetchBillets = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ccm/billet`);
      if (response.ok) {
        const data = await response.json();
        setBillets(data.filter((b: any) => b.status === 'completed' || b.status === 'cooling'));
      }
    } catch (error) {
      console.error('Error fetching billets:', error);
    }
  };

  const generateBatchNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setProductionBatch(`TMT-${dateStr}-${random}`);
  };

  const handleSubmit = async () => {
    if (!productionBatch || !bundleCount || !totalWeight) {
      const msg = 'Please fill required fields';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        production_batch: productionBatch,
        billet_batch_id: billetBatchId || 'direct-feed',
        mill_number: parseInt(millNumber),
        shift: shift.toLowerCase(),
        product_size: productSize,
        bundle_count: parseInt(bundleCount),
        total_weight: parseFloat(totalWeight),
        production_rate: productionRate ? parseFloat(productionRate) : null,
        operator_id: user?.id || 'unknown',
        quality_check: qualityCheck || null,
        remarks
      };

      const response = await fetch(`${BACKEND_URL}/api/rolling/production`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const msg = 'Production recorded!';
        Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);
        router.back();
      } else {
        throw new Error('Failed');
      }
    } catch (error: any) {
      Platform.OS === 'web' ? alert('Failed to record') : Alert.alert('Error', 'Failed');
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
        <Text style={styles.headerTitle}>New TMT Production</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Batch Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Production Batch *</Text>
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1 }]} value={productionBatch} onChangeText={setProductionBatch} />
            <TouchableOpacity style={styles.refreshBtn} onPress={generateBatchNumber}>
              <Ionicons name="refresh" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Billet Source */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>From Billet Batch</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity style={[styles.chip, !billetBatchId && styles.chipSelected]} onPress={() => setBilletBatchId('')}>
              <Text style={[styles.chipText, !billetBatchId && styles.chipTextSelected]}>Direct Feed</Text>
            </TouchableOpacity>
            {billets.map((b) => (
              <TouchableOpacity key={b._id} style={[styles.chip, billetBatchId === b._id && styles.chipSelected]} onPress={() => setBilletBatchId(b._id)}>
                <Text style={[styles.chipText, billetBatchId === b._id && styles.chipTextSelected]}>{b.billet_batch}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Mill & Shift */}
        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Mill</Text>
            <View style={styles.optionRow}>
              {['1', '2'].map((num) => (
                <TouchableOpacity key={num} style={[styles.optionButton, millNumber === num && styles.optionSelected]} onPress={() => setMillNumber(num)}>
                  <Text style={[styles.optionText, millNumber === num && styles.optionTextSelected]}>Mill-{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={[styles.inputGroup, { flex: 1.5 }]}>
            <Text style={styles.label}>Shift</Text>
            <View style={styles.optionRow}>
              {SHIFTS.map((s) => (
                <TouchableOpacity key={s} style={[styles.optionButton, shift === s && styles.optionSelected]} onPress={() => setShift(s)}>
                  <Text style={[styles.optionText, shift === s && styles.optionTextSelected]}>{s[0]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* TMT Size */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>TMT Size *</Text>
          <View style={styles.sizeGrid}>
            {TMT_SIZES.map((size) => (
              <TouchableOpacity key={size} style={[styles.sizeButton, productSize === size && styles.sizeSelected]} onPress={() => setProductSize(size)}>
                <Text style={[styles.sizeText, productSize === size && styles.sizeTextSelected]}>{size}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bundle Count & Weight */}
        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Bundle Count *</Text>
            <TextInput style={styles.input} value={bundleCount} onChangeText={setBundleCount} keyboardType="numeric" placeholder="Bundles" />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Total Weight (kg) *</Text>
            <TextInput style={styles.input} value={totalWeight} onChangeText={setTotalWeight} keyboardType="numeric" placeholder="Weight" />
          </View>
        </View>

        {/* Production Rate */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Production Rate (tons/hour)</Text>
          <TextInput style={styles.input} value={productionRate} onChangeText={setProductionRate} keyboardType="numeric" placeholder="Tons per hour" />
        </View>

        {/* Quality Check */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Quality Check</Text>
          <View style={styles.optionRow}>
            <TouchableOpacity style={[styles.qcButton, qualityCheck === 'passed' && styles.qcPassed]} onPress={() => setQualityCheck(qualityCheck === 'passed' ? '' : 'passed')}>
              <Ionicons name="checkmark-circle" size={20} color={qualityCheck === 'passed' ? '#fff' : '#4caf50'} />
              <Text style={[styles.qcText, qualityCheck === 'passed' && { color: '#fff' }]}>Passed</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.qcButton, qualityCheck === 'failed' && styles.qcFailed]} onPress={() => setQualityCheck(qualityCheck === 'failed' ? '' : 'failed')}>
              <Ionicons name="close-circle" size={20} color={qualityCheck === 'failed' ? '#fff' : '#f44336'} />
              <Text style={[styles.qcText, qualityCheck === 'failed' && { color: '#fff' }]}>Failed</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Remarks */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Remarks</Text>
          <TextInput style={[styles.input, { height: 80 }]} value={remarks} onChangeText={setRemarks} multiline placeholder="Notes..." />
        </View>

        <TouchableOpacity style={[styles.submitButton, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
          <Ionicons name="layers" size={24} color="#fff" />
          <Text style={styles.submitText}>{loading ? 'Saving...' : 'Record Production'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#4caf50', padding: 16, paddingTop: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  content: { flex: 1, padding: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#263238', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, fontSize: 16 },
  row: { flexDirection: 'row', gap: 8 },
  refreshBtn: { backgroundColor: '#4caf50', padding: 12, borderRadius: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', marginRight: 8 },
  chipSelected: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  chipText: { fontSize: 13, color: '#78909c' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  rowInputs: { flexDirection: 'row', gap: 12 },
  optionRow: { flexDirection: 'row', gap: 8 },
  optionButton: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, alignItems: 'center', backgroundColor: '#fff' },
  optionSelected: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  optionText: { fontSize: 13, color: '#263238', fontWeight: '500' },
  optionTextSelected: { color: '#fff' },
  sizeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sizeButton: { paddingHorizontal: 20, paddingVertical: 14, borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 10, backgroundColor: '#fff' },
  sizeSelected: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  sizeText: { fontSize: 16, fontWeight: 'bold', color: '#263238' },
  sizeTextSelected: { color: '#fff' },
  qcButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, backgroundColor: '#fff' },
  qcPassed: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  qcFailed: { backgroundColor: '#f44336', borderColor: '#f44336' },
  qcText: { fontSize: 14, fontWeight: '600', color: '#263238' },
  submitButton: { backgroundColor: '#4caf50', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10, marginBottom: 40 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
