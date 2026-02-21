import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function BreakdownDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [breakdown, setBreakdown] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => { fetchBreakdown(); }, [id]);

  const fetchBreakdown = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/maintenance/breakdown/${id}`);
      if (response.ok) {
        setBreakdown(await response.json());
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string, additionalData: any = {}) => {
    setUpdating(true);
    try {
      const updatePayload: any = { status: newStatus, ...additionalData };
      
      if (newStatus === 'in_progress' && !breakdown.start_repair_time) {
        updatePayload.start_repair_time = new Date().toISOString();
        updatePayload.assigned_to = user?.username || 'Unknown';
      }
      
      if (newStatus === 'resolved') {
        updatePayload.end_repair_time = new Date().toISOString();
      }

      const response = await fetch(`${BACKEND_URL}/api/maintenance/breakdown/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      if (response.ok) {
        fetchBreakdown();
        const msg = 'Status updated!';
        Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getSeverityColor = (s: string) => {
    switch (s) {
      case 'critical': return '#f44336';
      case 'major': return '#ff9800';
      case 'minor': return '#4caf50';
      default: return '#78909c';
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'reported': return '#ff9800';
      case 'assigned': return '#2196f3';
      case 'in_progress': return '#9c27b0';
      case 'resolved': return '#4caf50';
      case 'closed': return '#78909c';
      default: return '#78909c';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#9c27b0" />
      </View>
    );
  }

  if (!breakdown) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Breakdown not found</Text>
      </View>
    );
  }

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: getSeverityColor(breakdown.severity) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{breakdown.breakdown_id}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(breakdown.status) }]}>
            <Text style={styles.statusTextLarge}>{breakdown.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
          <Text style={styles.equipmentName}>{breakdown.equipment_name}</Text>
          <Text style={styles.location}>{breakdown.location}</Text>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Problem Description</Text>
          <Text style={styles.description}>{breakdown.description}</Text>
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <Ionicons name="alert-circle" size={20} color="#ff9800" />
              <View>
                <Text style={styles.timelineLabel}>Reported</Text>
                <Text style={styles.timelineValue}>{new Date(breakdown.reported_time).toLocaleString()}</Text>
                <Text style={styles.timelineBy}>by {breakdown.reported_by}</Text>
              </View>
            </View>
            {breakdown.start_repair_time && (
              <View style={styles.timelineItem}>
                <Ionicons name="construct" size={20} color="#9c27b0" />
                <View>
                  <Text style={styles.timelineLabel}>Repair Started</Text>
                  <Text style={styles.timelineValue}>{new Date(breakdown.start_repair_time).toLocaleString()}</Text>
                  {breakdown.assigned_to && <Text style={styles.timelineBy}>by {breakdown.assigned_to}</Text>}
                </View>
              </View>
            )}
            {breakdown.end_repair_time && (
              <View style={styles.timelineItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
                <View>
                  <Text style={styles.timelineLabel}>Resolved</Text>
                  <Text style={styles.timelineValue}>{new Date(breakdown.end_repair_time).toLocaleString()}</Text>
                  {breakdown.downtime_minutes && (
                    <Text style={styles.downtimeText}>Downtime: {breakdown.downtime_minutes} minutes</Text>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        {canManage && breakdown.status !== 'closed' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <View style={styles.actionButtons}>
              {breakdown.status === 'reported' && (
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#9c27b0' }]}
                  onPress={() => updateStatus('in_progress')}
                  disabled={updating}
                >
                  <Ionicons name="construct" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Start Repair</Text>
                </TouchableOpacity>
              )}
              {breakdown.status === 'in_progress' && (
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#4caf50' }]}
                  onPress={() => updateStatus('resolved')}
                  disabled={updating}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Mark Resolved</Text>
                </TouchableOpacity>
              )}
              {breakdown.status === 'resolved' && (
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#78909c' }]}
                  onPress={() => updateStatus('closed')}
                  disabled={updating}
                >
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Close Ticket</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {breakdown.remarks && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Remarks</Text>
            <Text style={styles.remarks}>{breakdown.remarks}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, paddingTop: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  content: { flex: 1, padding: 16 },
  statusCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, elevation: 2 },
  statusBadgeLarge: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  statusTextLarge: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  equipmentName: { fontSize: 22, fontWeight: 'bold', color: '#263238', marginTop: 16 },
  location: { fontSize: 14, color: '#78909c', marginTop: 4 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#9c27b0', marginBottom: 12 },
  description: { fontSize: 15, color: '#455a64', lineHeight: 22 },
  timeline: { gap: 16 },
  timelineItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  timelineLabel: { fontSize: 12, color: '#78909c' },
  timelineValue: { fontSize: 14, fontWeight: '600', color: '#263238' },
  timelineBy: { fontSize: 12, color: '#9c27b0' },
  downtimeText: { fontSize: 12, color: '#f44336', fontWeight: '600', marginTop: 2 },
  actionButtons: { gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14, borderRadius: 10 },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  remarks: { fontSize: 14, color: '#78909c', fontStyle: 'italic' },
});
