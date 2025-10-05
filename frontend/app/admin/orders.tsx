import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface Order {
  id: string;
  items: Array<{
    product_id: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
  }>;
  customer_info: {
    name: string;
    email: string;
    phone: string;
  };
  shipping_address: {
    street: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
  total_amount: number;
  payment_status: string;
  order_status: string;
  created_at: string;
}

const ORDER_STATUSES = [
  'processing',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled'
];

export default function AdminOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/orders`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        Alert.alert('Error', 'Failed to load orders');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error while loading orders');
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
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'processing':
        return 'time-outline';
      case 'confirmed':
        return 'checkmark-circle-outline';
      case 'shipped':
        return 'airplane-outline';
      case 'delivered':
        return 'checkmark-done-circle-outline';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order_status: newStatus }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Order status updated successfully!');
        setStatusModalVisible(false);
        fetchOrders();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update order status');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openStatusModal = (order: Order) => {
    setSelectedOrder(order);
    setStatusModalVisible(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Loading orders...</Text>
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
        <Text style={styles.title}>Orders Management</Text>
        <TouchableOpacity onPress={fetchOrders}>
          <Ionicons name="refresh" size={24} color="#1e293b" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptySubtitle}>
              Orders will appear here when customers make purchases
            </Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {orders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderCustomer}>{order.customer_info.name}</Text>
                    <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                  </View>
                  <View style={styles.orderAmount}>
                    <Text style={styles.orderTotal}>${order.total_amount.toFixed(2)}</Text>
                    <View style={styles.paymentStatus}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(order.payment_status) }
                      ]} />
                      <Text style={styles.paymentStatusText}>{order.payment_status}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.orderDetails}>
                  <Text style={styles.orderItemsTitle}>Items:</Text>
                  {order.items.map((item, index) => (
                    <Text key={index} style={styles.orderItem}>
                      • {item.name} x{item.quantity} - ${item.total.toFixed(2)}
                    </Text>
                  ))}
                </View>

                <View style={styles.shippingInfo}>
                  <Text style={styles.shippingTitle}>Shipping to:</Text>
                  <Text style={styles.shippingAddress}>
                    {order.shipping_address.street}, {order.shipping_address.city}, 
                    {' '}{order.shipping_address.state} {order.shipping_address.zip_code}
                  </Text>
                  <Text style={styles.customerContact}>
                    {order.customer_info.email} • {order.customer_info.phone}
                  </Text>
                </View>

                <View style={styles.orderFooter}>
                  <TouchableOpacity 
                    style={styles.statusButton}
                    onPress={() => openStatusModal(order)}
                  >
                    <Ionicons 
                      name={getStatusIcon(order.order_status)} 
                      size={16} 
                      color={getStatusColor(order.order_status)} 
                    />
                    <Text style={[
                      styles.statusButtonText,
                      { color: getStatusColor(order.order_status) }
                    ]}>
                      {order.order_status}
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.orderId}>#{order.id.slice(-8)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Status Update Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={statusModalVisible}
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Order Status</Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.currentOrderText}>
                Order: {selectedOrder?.customer_info.name}
              </Text>
              <Text style={styles.currentStatusText}>
                Current Status: {selectedOrder?.order_status}
              </Text>

              <Text style={styles.statusOptionsTitle}>Select New Status:</Text>
              
              {ORDER_STATUSES.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    selectedOrder?.order_status === status && styles.statusOptionCurrent
                  ]}
                  onPress={() => selectedOrder && updateOrderStatus(selectedOrder.id, status)}
                  disabled={updatingStatus || selectedOrder?.order_status === status}
                >
                  <Ionicons 
                    name={getStatusIcon(status)} 
                    size={20} 
                    color={getStatusColor(status)} 
                  />
                  <Text style={[
                    styles.statusOptionText,
                    { color: getStatusColor(status) }
                  ]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                  {selectedOrder?.order_status === status && (
                    <Ionicons name="checkmark" size={20} color={getStatusColor(status)} />
                  )}
                </TouchableOpacity>
              ))}

              {updatingStatus && (
                <View style={styles.updatingContainer}>
                  <ActivityIndicator size="small" color="#7c3aed" />
                  <Text style={styles.updatingText}>Updating status...</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  ordersList: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  orderDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  orderAmount: {
    alignItems: 'flex-end',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  paymentStatusText: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  orderDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    marginBottom: 12,
  },
  orderItemsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  orderItem: {
    fontSize: 12,
    color: '#374151',
    marginVertical: 1,
  },
  shippingInfo: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    marginBottom: 12,
  },
  shippingTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  shippingAddress: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 16,
  },
  customerContact: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  orderId: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalContent: {
    padding: 20,
  },
  currentOrderText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 4,
  },
  currentStatusText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  statusOptionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
  },
  statusOptionCurrent: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
  },
  updatingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
  updatingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748b',
  },
});