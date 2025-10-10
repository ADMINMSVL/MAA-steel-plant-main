import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function CreateWeighbridge() {
  const router = useRouter();
  const { user } = useAuth();
  const [gateEntries, setGateEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [image, setImage] = useState<string | null>(null);
  const [extractedWeight, setExtractedWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(true);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetchGateEntries();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required to capture weighbridge photos');
    }
  };

  const fetchGateEntries = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/gate-entry`);
      const data = await response.json();
      // Filter only entered status
      const pendingEntries = data.filter((e: any) => e.status === 'entered');
      setGateEntries(pendingEntries);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoadingEntries(false);
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setImage(result.assets[0].base64);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setImage(result.assets[0].base64);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSubmit = async () => {
    if (!selectedEntry || !image) {
      Alert.alert('Error', 'Please select an entry and capture/upload a photo');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/weighbridge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gate_entry_id: selectedEntry._id,
          weight_image: image,
          operator_id: user?.id || '',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create weighbridge entry');
      }

      const data = await response.json();
      setExtractedWeight(data.extracted_weight);
      
      Alert.alert(
        'Success',
        `Weighbridge entry created!\n${data.extracted_weight ? `Extracted Weight: ${data.extracted_weight} kg` : 'Weight could not be extracted, please enter manually.'}`,
        [
          {
            text: 'Done',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create weighbridge entry');
    } finally {
      setLoading(false);
    }
  };

  if (loadingEntries) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e88e5" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weighbridge</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Select Gate Entry *</Text>
        {gateEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="information-circle" size={32} color="#9e9e9e" />
            <Text style={styles.emptyText}>No pending gate entries</Text>
          </View>
        ) : (
          <View style={styles.entriesContainer}>
            {gateEntries.map((entry: any) => (
              <TouchableOpacity
                key={entry._id}
                style={[
                  styles.entryCard,
                  selectedEntry?._id === entry._id && styles.entryCardSelected,
                ]}
                onPress={() => setSelectedEntry(entry)}
              >
                <View style={styles.entryCardLeft}>
                  <Text style={styles.vehicleText}>{entry.vehicle_number}</Text>
                  <Text style={styles.materialText}>{entry.material_type}</Text>
                </View>
                {selectedEntry?._id === entry._id && (
                  <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={[styles.label, { marginTop: 24 }]}>Weighbridge Photo *</Text>
        
        {image ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: `data:image/jpeg;base64,${image}` }}
              style={styles.image}
            />
            <TouchableOpacity style={styles.removeButton} onPress={() => setImage(null)}>
              <Ionicons name="close-circle" size={32} color="#d32f2f" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraButtons}>
            <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
              <Ionicons name="camera" size={32} color="#ffffff" />
              <Text style={styles.cameraButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
              <Ionicons name="images" size={32} color="#2196f3" />
              <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {extractedWeight && (
          <View style={styles.weightCard}>
            <Ionicons name="scale" size={32} color="#4caf50" />
            <Text style={styles.weightText}>Extracted Weight: {extractedWeight} kg</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading || !selectedEntry || !image}
        >
          <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
          <Text style={styles.submitButtonText}>
            {loading ? 'Processing...' : 'Submit Weighbridge Entry'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    marginBottom: 12,
  },
  entriesContainer: {
    gap: 12,
  },
  entryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  entryCardSelected: {
    borderColor: '#4caf50',
    backgroundColor: '#e8f5e9',
  },
  entryCardLeft: {
    flex: 1,
  },
  vehicleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#263238',
  },
  materialText: {
    fontSize: 14,
    color: '#78909c',
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9e9e9e',
    marginTop: 8,
  },
  cameraButtons: {
    gap: 12,
  },
  cameraButton: {
    backgroundColor: '#2196f3',
    borderRadius: 8,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  cameraButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  galleryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  galleryButtonText: {
    color: '#2196f3',
    fontSize: 18,
    fontWeight: 'bold',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  weightCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  weightText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  submitButton: {
    backgroundColor: '#ff9800',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ffcc80',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
