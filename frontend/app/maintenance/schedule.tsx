import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, Alert, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const EQUIPMENT_LIST = [
  'Furnace-1', 'Furnace-2', 'Furnace-3',
  'CCM-1', 'CCM-2',
  'Rolling Mill-1', 'Rolling Mill-2',
  'Transformer', 'Compressor', 'Cooling Tower'
];

const MAINTENANCE_TYPES = [
  { type: 'preventive', label: 'Preventive', icon: 'shield-checkmark', color: '#4caf50' },
  { type: 'predictive', label: 'Predictive', icon: 'analytics', color: '#2196f3' },
  { type: 'corrective', label: 'Corrective', icon: 'construct', color: '#ff9800' },
];

const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];

export default function ScheduleMaintenance() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [equipmentName, setEquipmentName] = useState('');
  const [equipmentType, setEquipmentType] = useState('furnace');
  const [maintenanceType, setMaintenanceType] = useState('preventive');
  const [frequency, setFrequency] = useState('Monthly');
  const [assignedTo, setAssignedTo] = useState('');
  const [checklist, setChecklist] = useState('');
  const [remarks, setRemarks] = useState('');

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const handleSubmit = async () => {
    if (!equipmentName) {
      const msg = 'Please select equipment';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
      return;
    }

    setLoading(true);
    try {
      const scheduledDate = new Date();
      // Set to next occurrence based on frequency
      switch (frequency) {
        case 'Daily': scheduledDate.setDate(scheduledDate.getDate() + 1); break;
        case 'Weekly': scheduledDate.setDate(scheduledDate.getDate() + 7); break;
        case 'Monthly': scheduledDate.setMonth(scheduledDate.getMonth() + 1); break;
        case 'Quarterly': scheduledDate.setMonth(scheduledDate.getMonth() + 3); break;
        case 'Yearly': scheduledDate.setFullYear(scheduledDate.getFullYear() + 1); break;
      }

      const payload = {
        equipment_name: equipmentName,
        equipment_type: equipmentType,
        maintenance_type: maintenanceType,
        scheduled_date: scheduledDate.toISOString(),
        frequency: frequency.toLowerCase(),
        assigned_to: assignedTo || null,
        checklist: checklist || null,
        remarks: remarks || null,
        created_by: user?.username || user?.id || 'unknown'
      };

      const response = await fetch(`${BACKEND_URL}/api/maintenance/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        const msg = `Maintenance scheduled!\nID: ${result.schedule_id}`;
        Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);
        router.back();
      } else {
        throw new Error('Failed');
      }
    } catch (error: any) {
      Platform.OS === 'web' ? alert('Failed to schedule') : Alert.alert('Error', 'Failed');
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
        <Text style={styles.headerTitle}>Schedule Maintenance</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Equipment Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Select Equipment *</Text>
          <View style={styles.equipmentGrid}>
            {EQUIPMENT_LIST.map((eq) => (
              <TouchableOpacity
                key={eq}
                style={[styles.equipmentChip, equipmentName === eq && styles.equipmentSelected]}
                onPress={() => {
                  setEquipmentName(eq);
                  if (eq.includes('Furnace')) setEquipmentType('furnace');
                  else if (eq.includes('CCM')) setEquipmentType('ccm');
                  else if (eq.includes('Mill')) setEquipmentType('rolling_mill');
                  else setEquipmentType('utility');
                }}
              >
                <Text style={[styles.equipmentChipText, equipmentName === eq && styles.equipmentChipTextSelected]}>{eq}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Maintenance Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Maintenance Type</Text>
          <View style={styles.typeRow}>
            {MAINTENANCE_TYPES.map((mt) => (
              <TouchableOpacity
                key={mt.type}
                style={[styles.typeCard, maintenanceType === mt.type && { backgroundColor: mt.color, borderColor: mt.color }]}
                onPress={() => setMaintenanceType(mt.type)}
              >
                <Ionicons name={mt.icon as any} size={24} color={maintenanceType === mt.type ? '#fff' : mt.color} />
                <Text style={[styles.typeLabel, maintenanceType === mt.type && { color: '#fff' }]}>{mt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Frequency */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Frequency</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {FREQUENCIES.map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[styles.freqChip, frequency === freq && styles.freqSelected]}
                onPress={() => setFrequency(freq)}
              >
                <Text style={[styles.freqText, frequency === freq && { color: '#fff' }]}>{freq}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Assigned To */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Assign To</Text>
          <TextInput
            style={styles.input}
            value={assignedTo}
            onChangeText={setAssignedTo}
            placeholder="Technician name (optional)"
          />
        </View>

        {/* Checklist */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Maintenance Checklist</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={checklist}
            onChangeText={setChecklist}
            placeholder="- Check oil levels\n- Inspect bearings\n- Clean filters\n- Test safety switches"
            multiline
            numberOfLines={5}
          />
        </View>

        {/* Remarks */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={[styles.input, { height: 60 }]}
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Any special instructions..."
            multiline
          />
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, loading && { opacity: 0.6 }]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          <Ionicons name="calendar-outline" size={24} color="#fff" />
          <Text style={styles.submitText}>{loading ? 'Scheduling...' : 'Schedule Maintenance'}</Text>
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
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#263238', marginBottom: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 14, fontSize: 16 },
  textArea: { height: 120, textAlignVertical: 'top' },
  equipmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  equipmentChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0' },
  equipmentSelected: { backgroundColor: '#2196f3', borderColor: '#2196f3' },
  equipmentChipText: { fontSize: 13, color: '#78909c' },
  equipmentChipTextSelected: { color: '#fff', fontWeight: '600' },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeCard: { flex: 1, padding: 14, borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 12, alignItems: 'center', backgroundColor: '#fff' },
  typeLabel: { fontSize: 12, fontWeight: '600', color: '#263238', marginTop: 6 },
  freqChip: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', marginRight: 10 },
  freqSelected: { backgroundColor: '#2196f3', borderColor: '#2196f3' },
  freqText: { fontSize: 14, fontWeight: '500', color: '#78909c' },
  submitButton: { backgroundColor: '#2196f3', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10, marginBottom: 40 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
