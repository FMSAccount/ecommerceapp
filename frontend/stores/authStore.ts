import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  name: string;
  phone: string;
}

export interface Admin {
  id: string;
  username: string;
  full_name: string;
}

interface AuthStore {
  isLoggedIn: boolean;
  user: User | null;
  admin: Admin | null;
  token: string | null;
  userType: 'customer' | 'admin' | null;
  
  // Actions
  loginUser: (token: string, user: User) => Promise<void>;
  loginAdmin: (token: string, admin: Admin) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  
  // Auth state checks
  isCustomer: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isLoggedIn: false,
  user: null,
  admin: null,
  token: null,
  userType: null,

  loginUser: async (token: string, user: User) => {
    try {
      await AsyncStorage.multiSet([
        ['auth_token', token],
        ['user_data', JSON.stringify(user)],
        ['user_type', 'customer']
      ]);
      
      set({
        isLoggedIn: true,
        token,
        user,
        admin: null,
        userType: 'customer'
      });
    } catch (error) {
      console.error('Error saving user auth data:', error);
    }
  },

  loginAdmin: async (token: string, admin: Admin) => {
    try {
      await AsyncStorage.multiSet([
        ['auth_token', token],
        ['admin_data', JSON.stringify(admin)],
        ['user_type', 'admin']
      ]);
      
      set({
        isLoggedIn: true,
        token,
        admin,
        user: null,
        userType: 'admin'
      });
    } catch (error) {
      console.error('Error saving admin auth data:', error);
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.multiRemove([
        'auth_token',
        'user_data',
        'admin_data',
        'user_type'
      ]);
      
      set({
        isLoggedIn: false,
        user: null,
        admin: null,
        token: null,
        userType: null
      });
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  },

  loadStoredAuth: async () => {
    try {
      const storedData = await AsyncStorage.multiGet([
        'auth_token',
        'user_data',
        'admin_data',
        'user_type'
      ]);
      
      const token = storedData[0][1];
      const userData = storedData[1][1];
      const adminData = storedData[2][1];
      const userType = storedData[3][1] as 'customer' | 'admin' | null;
      
      if (token && userType) {
        if (userType === 'customer' && userData) {
          set({
            isLoggedIn: true,
            token,
            user: JSON.parse(userData),
            admin: null,
            userType: 'customer'
          });
        } else if (userType === 'admin' && adminData) {
          set({
            isLoggedIn: true,
            token,
            admin: JSON.parse(adminData),
            user: null,
            userType: 'admin'
          });
        }
      }
    } catch (error) {
      console.error('Error loading stored auth data:', error);
    }
  },

  isCustomer: () => {
    const state = get();
    return state.isLoggedIn && state.userType === 'customer';
  },

  isAdmin: () => {
    const state = get();
    return state.isLoggedIn && state.userType === 'admin';
  },
}));