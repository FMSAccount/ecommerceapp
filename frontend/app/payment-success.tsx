import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentSuccess() {
  const router = useRouter();
  const { session_id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<any>(null);
  const [pollingCount, setPollingCount] = useState(0);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
  const MAX_POLLING_ATTEMPTS = 10;

  useEffect(() => {
    if (session_id) {
      pollPaymentStatus();
    } else {
      setLoading(false);
      Alert.alert('Error', 'No session ID found');
    }
  }, [session_id]);

  const pollPaymentStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payments/status/${session_id}`);
      if (response.ok) {
        const status = await response.json();
        setPaymentStatus(status);
        
        if (status.payment_status === 'paid') {
          setLoading(false);
        } else if (status.status === 'expired' || pollingCount >= MAX_POLLING_ATTEMPTS) {
          setLoading(false);
        } else {
          // Continue polling
          setTimeout(() => {
            setPollingCount(prev => prev + 1);
            pollPaymentStatus();
          }, 2000);
        }
      } else {
        throw new Error('Failed to check payment status');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to verify payment status');
    }
  };

  const getStatusMessage = () => {
    if (!paymentStatus) return { title: 'Processing...', message: 'Verifying your payment' };
    
    switch (paymentStatus.payment_status) {
      case 'paid':
        return {
          title: 'Payment Successful!',
          message: 'Your order has been confirmed and will be processed soon.',
          icon: 'checkmark-circle',
          color: '#10b981'
        };
      case 'unpaid':
        return {
          title: 'Payment Pending',
          message: 'Your payment is still being processed. Please wait...',
          icon: 'time',
          color: '#f59e0b'
        };
      default:
        return {
          title: 'Payment Failed',
          message: 'There was an issue processing your payment. Please try again.',
          icon: 'close-circle',
          color: '#ef4444'
        };
    }
  };

  const statusInfo = getStatusMessage();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingTitle}>Verifying Payment</Text>
            <Text style={styles.loadingMessage}>
              Please wait while we confirm your payment...
            </Text>
            <Text style={styles.pollingText}>
              Attempt {pollingCount + 1} of {MAX_POLLING_ATTEMPTS}
            </Text>
          </View>
        ) : (
          <View style={styles.resultContainer}>
            <View style={[styles.iconContainer, { backgroundColor: `${statusInfo.color}20` }]}>
              <Ionicons name={statusInfo.icon} size={64} color={statusInfo.color} />
            </View>
            
            <Text style={styles.statusTitle}>{statusInfo.title}</Text>
            <Text style={styles.statusMessage}>{statusInfo.message}</Text>

            {paymentStatus && (
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount:</Text>
                  <Text style={styles.detailValue}>
                    ${(paymentStatus.amount_total / 100).toFixed(2)} {paymentStatus.currency?.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={[styles.detailValue, { color: statusInfo.color }]}>
                    {paymentStatus.payment_status?.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Session ID:</Text>
                  <Text style={[styles.detailValue, styles.sessionId]}>
                    {typeof session_id === 'string' ? session_id.slice(-12) : ''}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.actionContainer}>
              {paymentStatus?.payment_status === 'paid' ? (
                <>
                  <TouchableOpacity 
                    style={styles.primaryButton}
                    onPress={() => router.push('/shop')}
                  >
                    <Ionicons name="bag" size={20} color="white" />
                    <Text style={styles.primaryButtonText}>Continue Shopping</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.secondaryButton}
                    onPress={() => router.push('/')}
                  >
                    <Text style={styles.secondaryButtonText}>Back to Home</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity 
                    style={styles.primaryButton}
                    onPress={() => router.push('/shop/cart')}
                  >
                    <Ionicons name="arrow-back" size={20} color="white" />
                    <Text style={styles.primaryButtonText}>Back to Cart</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.secondaryButton}
                    onPress={pollPaymentStatus}
                  >
                    <Ionicons name="refresh" size={16} color="#2563eb" />
                    <Text style={styles.secondaryButtonText}>Check Again</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}
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
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 24,
    marginBottom: 8,
  },
  loadingMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  pollingText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 16,
  },
  resultContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  statusMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  sessionId: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  actionContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
});