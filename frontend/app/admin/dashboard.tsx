import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface DashboardData {
  products_count: number;
  orders_count: number;
  pending_orders: number;
  total_revenue: number;
  recent_orders: Order[];
}

interface Order {
  id: string;
  total_amount: number;
  order_status: string;
  payment_status: string;
  customer_info: {
    name: string;
    email: string;
  };
  created_at: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/dashboard`);
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        Alert.alert('Error', 'Failed to load dashboard data');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error while loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'processing':
      case 'pending':
        return '#f59e0b';
      case 'confirmed':
      case 'paid':
        return '#10b981';
      case 'shipped':
        return '#3b82f6';
      case 'delivered':
        return '#059669';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>Admin Dashboard</Text>
        <TouchableOpacity onPress={fetchDashboardData}>
          <Ionicons name="refresh" size={24} color="#1e293b" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="cube" size={24} color="#2563eb" />
            <Text style={styles.statNumber}>{dashboardData?.products_count || 0}</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="receipt" size={24} color="#059669" />
            <Text style={styles.statNumber}>{dashboardData?.orders_count || 0}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color="#f59e0b" />
            <Text style={styles.statNumber}>{dashboardData?.pending_orders || 0}</Text>
            <Text style={styles.statLabel}>Pending Orders</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="cash" size={24} color="#10b981" />
            <Text style={styles.statNumber}>${(dashboardData?.total_revenue || 0).toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/admin/products')}
          >
            <Ionicons name="add-circle" size={24} color="#2563eb" />
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Manage Products</Text>
              <Text style={styles.actionSubtitle}>Add, edit, or remove products</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/admin/orders')}
          >
            <Ionicons name="list" size={24} color="#059669" />
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>View Orders</Text>
              <Text style={styles.actionSubtitle}>Track and manage customer orders</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Recent Orders */}
        {dashboardData?.recent_orders && dashboardData.recent_orders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            
            {dashboardData.recent_orders.map((order, index) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderCustomer}>{order.customer_info.name}</Text>
                  <Text style={styles.orderAmount}>${order.total_amount.toFixed(2)}</Text>
                </View>
                
                <View style={styles.orderDetails}>
                  <View style={styles.orderStatus}>
                    <View style={[
                      styles.statusDot, 
                      { backgroundColor: getStatusColor(order.order_status) }
                    ]} />
                    <Text style={styles.statusText}>{order.order_status}</Text>
                  </View>
                  
                  <Text style={styles.orderDate}>
                    {formatDate(order.created_at)}
                  </Text>
                </View>
              </View>
            ))}

            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push('/admin/orders')}
            >
              <Text style={styles.viewAllText}>View All Orders</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginTop: 32,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  actionInfo: {
    flex: 1,
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  orderCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  orderDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#7c3aed',
    fontWeight: '500',
  },
});