import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, Alert, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const EQUIPMENT_TYPES = [
  { type: 'furnace', name: 'Furnace', icon: 'flame' },
  { type: 'ccm', name: 'CCM', icon: 'cube' },
  { type: 'rolling_mill', name: 'Rolling Mill', icon: 'layers' },
  { type: 'utility', name: 'Utility', icon: 'settings' },
];

const LOCATIONS = ['Melting Shop', 'CCM Area', 'Rolling Mill', 'Utility Section', 'Electrical Room'];
const SEVERITIES = [
  { level: 'critical', label: 'Critical', color: '#f44336', desc: 'Production stopped' },
  { level: 'major', label: 'Major', color: '#ff9800', desc: 'Reduced capacity' },
  { level: 'minor', label: 'Minor', color: '#4caf50', desc: 'Can continue' },
];

export default function ReportBreakdown() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [equipmentType, setEquipmentType] = useState('');
  const [equipmentName, setEquipmentName] = useState('');
  const [location, setLocation] = useState('');
  const [severity, setSeverity] = useState('');
  const [description, setDescription] = useState('');
  const [remarks, setRemarks] = useState('');

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const handleSubmit = async () => {
    if (!equipmentType || !equipmentName || !location || !severity || !description) {
      const msg = 'Please fill all required fields';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        equipment_name: equipmentName,
        equipment_type: equipmentType,
        reported_by: user?.username || user?.id || 'unknown',
        description,
        severity,
        location,
        remarks
      };

      const response = await fetch(`${BACKEND_URL}/api/maintenance/breakdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        const msg = `Breakdown reported!\nID: ${result.breakdown_id}`;
        if (Platform.OS === 'web') {
          alert(msg);
        } else {
          Alert.alert('Reported', msg);
        }
        router.back();
      } else {
        throw new Error('Failed');
      }
    } catch (error: any) {
      Platform.OS === 'web' ? alert('Failed to report') : Alert.alert('Error', 'Failed');
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
        <Text style={styles.headerTitle}>Report Breakdown</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Equipment Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Equipment Type *</Text>
          <View style={styles.typeGrid}>
            {EQUIPMENT_TYPES.map((eq) => (
              <TouchableOpacity
                key={eq.type}
                style={[styles.typeCard, equipmentType === eq.type && styles.typeSelected]}
                onPress={() => setEquipmentType(eq.type)}
              >
                <Ionicons name={eq.icon as any} size={28} color={equipmentType === eq.type ? '#fff' : '#9c27b0'} />
                <Text style={[styles.typeName, equipmentType === eq.type && { color: '#fff' }]}>{eq.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Equipment Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Equipment Name *</Text>
          <TextInput
            style={styles.input}
            value={equipmentName}
            onChangeText={setEquipmentName}
            placeholder="e.g., Furnace-1, CCM-2, Mill-1"
          />
        </View>

        {/* Location */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {LOCATIONS.map((loc) => (
              <TouchableOpacity
                key={loc}
                style={[styles.chip, location === loc && styles.chipSelected]}
                onPress={() => setLocation(loc)}
              >
                <Text style={[styles.chipText, location === loc && styles.chipTextSelected]}>{loc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Severity */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Severity *</Text>
          <View style={styles.severityContainer}>
            {SEVERITIES.map((sev) => (
              <TouchableOpacity
                key={sev.level}
                style={[styles.severityCard, severity === sev.level && { backgroundColor: sev.color, borderColor: sev.color }]}
                onPress={() => setSeverity(sev.level)}
              >
                <Text style={[styles.severityLabel, severity === sev.level && { color: '#fff' }]}>{sev.label}</Text>
                <Text style={[styles.severityDesc, severity === sev.level && { color: 'rgba(255,255,255,0.8)' }]}>{sev.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Problem Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the breakdown in detail...\n\nWhat happened?\nWhen did it start?\nAny unusual sounds/smells?"
            multiline
            numberOfLines={5}
          />
        </View>

        {/* Remarks */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Additional Remarks</Text>
          <TextInput
            style={[styles.input, { height: 60 }]}
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Any other information..."
            multiline
          />
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, loading && { opacity: 0.6 }]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          <Ionicons name="alert-circle" size={24} color="#fff" />
          <Text style={styles.submitText}>{loading ? 'Reporting...' : 'Report Breakdown'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#f44336', padding: 16, paddingTop: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  content: { flex: 1, padding: 16 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#263238', marginBottom: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 14, fontSize: 16 },
  textArea: { height: 120, textAlignVertical: 'top' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: { width: '48%', padding: 16, borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 12, alignItems: 'center', backgroundColor: '#fff' },
  typeSelected: { backgroundColor: '#9c27b0', borderColor: '#9c27b0' },
  typeName: { fontSize: 14, fontWeight: '600', color: '#263238', marginTop: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', marginRight: 10 },
  chipSelected: { backgroundColor: '#9c27b0', borderColor: '#9c27b0' },
  chipText: { fontSize: 14, color: '#78909c' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  severityContainer: { gap: 10 },
  severityCard: { padding: 16, borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 12, backgroundColor: '#fff' },
  severityLabel: { fontSize: 16, fontWeight: 'bold', color: '#263238' },
  severityDesc: { fontSize: 13, color: '#78909c', marginTop: 2 },
  submitButton: { backgroundColor: '#f44336', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10, marginBottom: 40 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
