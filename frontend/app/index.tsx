import React, { useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';

export default function Index() {
  const router = useRouter();
  const { isLoggedIn, userType, isCustomer, isAdmin, loadStoredAuth, logout } = useAuthStore();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const handleCustomerAccess = () => {
    if (isCustomer()) {
      router.push('/shop');
    } else {
      router.push('/auth/customer-login');
    }
  };

  const handleAdminAccess = () => {
    if (isAdmin()) {
      router.push('/admin/dashboard');
    } else {
      router.push('/auth/admin-login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="storefront" size={64} color="#2563eb" />
          <Text style={styles.title}>My Store</Text>
          <Text style={styles.subtitle}>Choose how you'd like to access our store</Text>
        </View>

        {isLoggedIn && (
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>
              Welcome back! You're logged in as {userType === 'admin' ? 'Admin' : 'Customer'}
            </Text>
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <Ionicons name="log-out-outline" size={16} color="#ef4444" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.customerButton]}
            onPress={handleCustomerAccess}
          >
            <Ionicons name="person" size={24} color="white" />
            <Text style={styles.buttonText}>
              {isCustomer() ? 'Continue Shopping' : 'Customer Login'}
            </Text>
            <Text style={styles.buttonSubtext}>
              {isCustomer() ? 'Browse & Buy Products' : 'Login with Phone OTP'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.adminButton]}
            onPress={handleAdminAccess}
          >
            <Ionicons name="shield-checkmark" size={24} color="white" />
            <Text style={styles.buttonText}>
              {isAdmin() ? 'Admin Dashboard' : 'Admin Login'}
            </Text>
            <Text style={styles.buttonSubtext}>
              {isAdmin() ? 'Manage Your Store' : 'Login with Username & Password'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Ionicons name="lock-closed" size={20} color="#10b981" />
            <Text style={styles.featureText}>Secure Authentication</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="card" size={20} color="#10b981" />
            <Text style={styles.featureText}>Safe Payments</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="car" size={20} color="#10b981" />
            <Text style={styles.featureText}>Fast Delivery</Text>
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