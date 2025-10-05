import React from 'react';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Index() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="storefront" size={64} color="#2563eb" />
          <Text style={styles.title}>My Store</Text>
          <Text style={styles.subtitle}>Welcome to our mobile shopping experience</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.customerButton]}
            onPress={() => router.push('/shop')}
          >
            <Ionicons name="bag-handle" size={24} color="white" />
            <Text style={styles.buttonText}>Shop Now</Text>
            <Text style={styles.buttonSubtext}>Browse & Buy Products</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.adminButton]}
            onPress={() => router.push('/admin')}
          >
            <Ionicons name="settings" size={24} color="white" />
            <Text style={styles.buttonText}>Admin Panel</Text>
            <Text style={styles.buttonSubtext}>Manage Your Store</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Ionicons name="card" size={20} color="#10b981" />
            <Text style={styles.featureText}>Secure Payments</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="car" size={20} color="#10b981" />
            <Text style={styles.featureText}>Fast Delivery</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="shield-checkmark" size={20} color="#10b981" />
            <Text style={styles.featureText}>Safe & Trusted</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 48,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  customerButton: {
    backgroundColor: '#2563eb',
  },
  adminButton: {
    backgroundColor: '#7c3aed',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    position: 'absolute',
    left: 56,
    top: 42,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
});