import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '../../stores/authStore';

interface LoginForm {
  name?: string;
  phone: string;
  otp?: string;
}

type LoginStep = 'phone' | 'register' | 'otp';

export default function CustomerLogin() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>('phone');
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const { loginUser } = useAuthStore();
  
  const { control, handleSubmit, watch, formState: { errors }, reset } = useForm<LoginForm>({
    defaultValues: {
      phone: '',
      name: '',
      otp: '',
    },
  });

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
  const watchedPhone = watch('phone');

  const sendOTP = async (phoneNumber: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      if (response.ok) {
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send OTP');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
      return false;
    }
  };

  const handlePhoneSubmit = async (data: LoginForm) => {
    if (!data.phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(data.phone.replace(/\s/g, ''))) {
      Alert.alert('Error', 'Please enter a valid phone number with country code (e.g., +1234567890)');
      return;
    }

    setLoading(true);
    const success = await sendOTP(data.phone);
    if (success) {
      Alert.alert(
        'Choose Action',
        'Are you a new user or existing user?',
        [
          {
            text: 'New User (Register)',
            onPress: () => {
              setIsNewUser(true);
              setStep('register');
            }
          },
          {
            text: 'Existing User (Login)',
            onPress: () => {
              setIsNewUser(false);
              setStep('otp');
            }
          }
        ]
      );
    }
    setLoading(false);
  };

  const handleRegister = async (data: LoginForm) => {
    if (!data.name?.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!data.otp?.trim()) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          otp: data.otp
        }),
      });

      if (response.ok) {
        const result = await response.json();
        await loginUser(result.access_token, result.user);
        Alert.alert(
          'Registration Successful!',
          'Welcome to our store!',
          [{ text: 'OK', onPress: () => router.replace('/shop') }]
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }
    } catch (error: any) {
      Alert.alert('Registration Error', error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (data: LoginForm) => {
    if (!data.otp?.trim()) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: data.phone,
          otp: data.otp
        }),
      });

      if (response.ok) {
        const result = await response.json();
        await loginUser(result.access_token, result.user);
        Alert.alert(
          'Login Successful!',
          `Welcome back, ${result.user.name}!`,
          [{ text: 'OK', onPress: () => router.replace('/shop') }]
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }
    } catch (error: any) {
      Alert.alert('Login Error', error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    setLoading(true);
    await sendOTP(watchedPhone);
    setLoading(false);
    Alert.alert('OTP Sent', 'A new OTP has been sent to your phone');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Login</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.iconContainer}>
            <Ionicons name="person-circle" size={80} color="#2563eb" />
          </View>
          
          <Text style={styles.title}>
            {step === 'phone' ? 'Enter Phone Number' : 
             step === 'register' ? 'Complete Registration' : 
             'Verify OTP'}
          </Text>
          
          <Text style={styles.subtitle}>
            {step === 'phone' ? 'We\'ll send you an OTP to verify your number' :
             step === 'register' ? 'Enter your details and the OTP you received' :
             `Enter the OTP sent to ${watchedPhone}`}
          </Text>

          {/* Phone Number Step */}
          {step === 'phone' && (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number *</Text>
                <Controller
                  control={control}
                  name="phone"
                  rules={{ required: 'Phone number is required' }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={styles.phoneInputContainer}>
                      <Ionicons name="call" size={20} color="#64748b" />
                      <TextInput
                        style={styles.input}
                        placeholder="+1234567890"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="phone-pad"
                        autoCapitalize="none"
                      />
                    </View>
                  )}
                />
                {errors.phone && (
                  <Text style={styles.errorText}>{errors.phone.message}</Text>
                )}
              </View>

              <TouchableOpacity 
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit(handlePhoneSubmit)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Registration Step */}
          {step === 'register' && (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name *</Text>
                <Controller
                  control={control}
                  name="name"
                  rules={{ required: 'Name is required' }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={styles.phoneInputContainer}>
                      <Ionicons name="person" size={20} color="#64748b" />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your full name"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        autoCapitalize="words"
                      />
                    </View>
                  )}
                />
                {errors.name && (
                  <Text style={styles.errorText}>{errors.name.message}</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>OTP *</Text>
                <Controller
                  control={control}
                  name="otp"
                  rules={{ required: 'OTP is required' }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={styles.phoneInputContainer}>
                      <Ionicons name="shield-checkmark" size={20} color="#64748b" />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter 6-digit OTP"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                  )}
                />
                {errors.otp && (
                  <Text style={styles.errorText}>{errors.otp.message}</Text>
                )}
              </View>

              <TouchableOpacity 
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit(handleRegister)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>Complete Registration</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* OTP Verification Step */}
          {step === 'otp' && (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>OTP *</Text>
                <Controller
                  control={control}
                  name="otp"
                  rules={{ required: 'OTP is required' }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={styles.phoneInputContainer}>
                      <Ionicons name="shield-checkmark" size={20} color="#64748b" />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter 6-digit OTP"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                  )}
                />
                {errors.otp && (
                  <Text style={styles.errorText}>{errors.otp.message}</Text>
                )}
              </View>

              <TouchableOpacity 
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit(handleLogin)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>Verify & Login</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Common actions for OTP steps */}
          {(step === 'otp' || step === 'register') && (
            <View style={styles.otpActions}>
              <TouchableOpacity onPress={resendOTP} disabled={loading}>
                <Text style={styles.resendText}>Didn't receive OTP? Resend</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => {
                reset();
                setStep('phone');
              }}>
                <Text style={styles.changeNumberText}>Change Phone Number</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  placeholder: {
    width: 24,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  form: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  otpActions: {
    alignItems: 'center',
    gap: 16,
    marginTop: 24,
  },
  resendText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  changeNumberText: {
    color: '#64748b',
    fontSize: 14,
  },
});