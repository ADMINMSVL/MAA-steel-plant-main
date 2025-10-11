import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function Reports() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gateEntries, setGateEntries] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  
  // Sorting options
  const [sortBy, setSortBy] = useState('date'); // date, vehicle, product, party
  const [searchQuery, setSearchQuery] = useState('');

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [gateEntries, sortBy, searchQuery]);

  const fetchAllData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/gate-entry`);
      const data = await response.json();
      setGateEntries(data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const applyFilters = () => {
    let filtered = [...gateEntries];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((entry: any) =>
        entry.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.material_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.supplier.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    switch (sortBy) {
      case 'date':
        filtered.sort((a: any, b: any) => 
          new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
        );
        break;
      case 'vehicle':
        filtered.sort((a: any, b: any) => 
          a.vehicle_number.localeCompare(b.vehicle_number)
        );
        break;
      case 'product':
        filtered.sort((a: any, b: any) => 
          a.material_type.localeCompare(b.material_type)
        );
        break;
      case 'party':
        filtered.sort((a: any, b: any) => 
          a.supplier.localeCompare(b.supplier)
        );
        break;
    }

    setFilteredData(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'entered': return '#2196f3';
      case 'weighed': return '#ff9800';
      case 'inspected': return '#9c27b0';
      case 'completed': return '#4caf50';
      default: return '#757575';
    }
  };

  const sortOptions = [
    { value: 'date', label: 'Date', icon: 'calendar' },
    { value: 'vehicle', label: 'Vehicle', icon: 'car' },
    { value: 'product', label: 'Product', icon: 'cube' },
    { value: 'party', label: 'Party', icon: 'business' },
  ];

  const renderEntry = ({ item }: any) => (
    <View style={styles.reportCard}>
      <View style={styles.reportCardHeader}>
        <View>
          <Text style={styles.vehicleNumber}>{item.vehicle_number}</Text>
          <Text style={styles.materialType}>{item.material_type}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.reportCardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="business" size={16} color="#546e7a" />
          <Text style={styles.infoText}>Party: {item.supplier}</Text>
        </View>
        
        {item.party_weight && (
          <View style={styles.infoRow}>
            <Ionicons name="scale" size={16} color="#546e7a" />
            <Text style={styles.infoText}>Party Weight: {item.party_weight} kg</Text>
          </View>
        )}
        
        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={16} color="#546e7a" />
          <Text style={styles.infoText}>
            {format(new Date(item.entry_date), 'dd MMM yyyy, hh:mm a')}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e88e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sorting Reports</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#78909c" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search vehicle, product, or party..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#78909c" />
          </TouchableOpacity>
        )}
      </View>

      {/* Sort Options */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortContainer}>
        {sortOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.sortButton,
              sortBy === option.value && styles.sortButtonActive,
            ]}
            onPress={() => setSortBy(option.value)}
          >
            <Ionicons
              name={option.icon as any}
              size={20}
              color={sortBy === option.value ? '#ffffff' : '#1e88e5'}
            />
            <Text
              style={[
                styles.sortButtonText,
                sortBy === option.value && styles.sortButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results Count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {filteredData.length} {filteredData.length === 1 ? 'Entry' : 'Entries'}
        </Text>
        <Text style={styles.sortedByText}>Sorted by: {sortBy}</Text>
      </View>

      {/* Report List */}
      <FlatList
        data={filteredData}
        renderItem={renderEntry}
        keyExtractor={(item: any) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={64} color="#9e9e9e" />
            <Text style={styles.emptyText}>No entries found</Text>
          </View>
        }
      />
    </View>
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
    backgroundColor: '#f5f5f5',
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
  searchContainer: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#263238',
  },
  sortContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#1e88e5',
    marginRight: 12,
    gap: 6,
  },
  sortButtonActive: {
    backgroundColor: '#1e88e5',
    borderColor: '#1e88e5',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e88e5',
  },
  sortButtonTextActive: {
    color: '#ffffff',
  },
  resultsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#e3f2fd',
  },
  resultsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0d47a1',
  },
  sortedByText: {
    fontSize: 14,
    color: '#1565c0',
  },
  list: {
    padding: 16,
  },
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  vehicleNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#263238',
  },
  materialType: {
    fontSize: 14,
    color: '#78909c',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  reportCardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#546e7a',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9e9e9e',
    marginTop: 16,
  },
});
