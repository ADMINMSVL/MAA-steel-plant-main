import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

interface BreakdownReport {
  _id: string;
  breakdown_id: string;
  equipment_name: string;
  equipment_type: string;
  description: string;
  severity: string;
  location: string;
  status: string;
  reported_time: string;
  assigned_to?: string;
  downtime_minutes?: number;
}

export default function MaintenanceList() {
  const router = useRouter();
  const { user } = useAuth();
  const [breakdowns, setBreakdowns] = useState<BreakdownReport[]>([]);
  const [stats, setStats] = useState({ total_breakdowns: 0, open_breakdowns: 0, critical_breakdowns: 0, overdue_maintenance: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'breakdowns' | 'scheduled'>('breakdowns');

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const fetchData = async () => {
    try {
      const [breakdownRes, statsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/maintenance/breakdown`),
        fetch(`${BACKEND_URL}/api/maintenance/stats`)
      ]);
      
      if (breakdownRes.ok) {
        setBreakdowns(await breakdownRes.json());
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#f44336';
      case 'major': return '#ff9800';
      case 'minor': return '#4caf50';
      default: return '#78909c';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reported': return '#ff9800';
      case 'assigned': return '#2196f3';
      case 'in_progress': return '#9c27b0';
      case 'resolved': return '#4caf50';
      case 'closed': return '#78909c';
      default: return '#78909c';
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = Platform.OS === 'web' ? window.confirm('Delete this breakdown report?') 
      : await new Promise((resolve) => Alert.alert('Delete', 'Delete?', 
          [{ text: 'Cancel', onPress: () => resolve(false) }, { text: 'Delete', onPress: () => resolve(true), style: 'destructive' }]));
    
    if (confirm) {
      await fetch(`${BACKEND_URL}/api/maintenance/breakdown/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const canDelete = user?.role === 'admin' || user?.role === 'manager';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Maintenance</Text>
        <TouchableOpacity onPress={() => router.push('/maintenance/report')} style={styles.addButton}>
          <Ionicons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Alert Banner for Critical Issues */}
        {stats.critical_breakdowns > 0 && (
          <View style={styles.alertBanner}>
            <Ionicons name="warning" size={24} color="#fff" />
            <Text style={styles.alertText}>{stats.critical_breakdowns} Critical Breakdown{stats.critical_breakdowns > 1 ? 's' : ''} Active!</Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#fff3e0' }]}>
            <Ionicons name="alert-circle" size={28} color="#ff9800" />
            <Text style={styles.statValue}>{stats.open_breakdowns}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#ffebee' }]}>
            <Ionicons name="flame" size={28} color="#f44336" />
            <Text style={styles.statValue}>{stats.critical_breakdowns}</Text>
            <Text style={styles.statLabel}>Critical</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#e8f5e9' }]}>
            <Ionicons name="checkmark-circle" size={28} color="#4caf50" />
            <Text style={styles.statValue}>{stats.total_breakdowns - stats.open_breakdowns}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#e3f2fd' }]}>
            <Ionicons name="time" size={28} color="#2196f3" />
            <Text style={styles.statValue}>{stats.overdue_maintenance}</Text>
            <Text style={styles.statLabel}>Overdue PM</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: '#f44336' }]} onPress={() => router.push('/maintenance/report')}>
            <Ionicons name="alert" size={24} color="#fff" />
            <Text style={styles.quickBtnText}>Report Breakdown</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: '#2196f3' }]} onPress={() => router.push('/maintenance/schedule')}>
            <Ionicons name="calendar" size={24} color="#fff" />
            <Text style={styles.quickBtnText}>Schedule PM</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Recent Breakdowns</Text>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : breakdowns.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="build-outline" size={48} color="#4caf50" />
            <Text style={styles.emptyText}>No breakdowns reported!</Text>
            <Text style={styles.emptySubText}>All equipment running smoothly</Text>
          </View>
        ) : (
          breakdowns.map((bd) => (
            <TouchableOpacity key={bd._id} style={styles.card} onPress={() => router.push(`/maintenance/detail?id=${bd._id}`)}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.equipmentRow}>
                    <View style={[styles.severityDot, { backgroundColor: getSeverityColor(bd.severity) }]} />
                    <Text style={styles.equipmentName}>{bd.equipment_name}</Text>
                  </View>
                  <Text style={styles.breakdownId}>{bd.breakdown_id}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(bd.status) }]}>
                  <Text style={styles.statusText}>{bd.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.description} numberOfLines={2}>{bd.description}</Text>
              <View style={styles.cardFooter}>
                <View style={styles.footerItem}>
                  <Ionicons name="location" size={14} color="#78909c" />
                  <Text style={styles.footerText}>{bd.location}</Text>
                </View>
                <View style={styles.footerItem}>
                  <Ionicons name="time" size={14} color="#78909c" />
                  <Text style={styles.footerText}>{new Date(bd.reported_time).toLocaleDateString()}</Text>
                </View>
                {bd.downtime_minutes && (
                  <View style={styles.footerItem}>
                    <Ionicons name="hourglass" size={14} color="#f44336" />
                    <Text style={[styles.footerText, { color: '#f44336' }]}>{bd.downtime_minutes} min</Text>
                  </View>
                )}
              </View>
              {canDelete && (
                <TouchableOpacity style={styles.deleteBtn} onPress={(e) => { e.stopPropagation?.(); handleDelete(bd._id); }}>
                  <Ionicons name="trash-outline" size={16} color="#f44336" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#9c27b0', padding: 16, paddingTop: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  addButton: { padding: 8 },
  content: { flex: 1, padding: 16 },
  alertBanner: { backgroundColor: '#f44336', padding: 14, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  alertText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: '48%', padding: 16, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#263238', marginTop: 4 },
  statLabel: { fontSize: 12, color: '#78909c' },
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  quickBtn: { flex: 1, padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  quickBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#263238', marginBottom: 12 },
  loadingText: { textAlign: 'center', color: '#78909c', marginTop: 20 },
  emptyCard: { backgroundColor: '#fff', padding: 32, borderRadius: 12, alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#4caf50', marginTop: 12 },
  emptySubText: { fontSize: 14, color: '#78909c', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, position: 'relative' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  equipmentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  severityDot: { width: 10, height: 10, borderRadius: 5 },
  equipmentName: { fontSize: 16, fontWeight: 'bold', color: '#263238' },
  breakdownId: { fontSize: 12, color: '#78909c', marginTop: 2, marginLeft: 18 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold', color: '#fff' },
  description: { fontSize: 14, color: '#455a64', marginTop: 10, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0', gap: 16 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 12, color: '#78909c' },
  deleteBtn: { position: 'absolute', top: 12, right: 12, padding: 6 },
});
