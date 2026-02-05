import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';
import { User, UserRole } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role: UserRole;
    company_name?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  loadAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { access_token, user } = response.data;
    
    await AsyncStorage.setItem('auth_token', access_token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    
    set({ user, token: access_token, isAuthenticated: true });
  },

  register: async (data) => {
    const response = await api.post('/auth/register', data);
    const { access_token, user } = response.data;
    
    await AsyncStorage.setItem('auth_token', access_token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    
    set({ user, token: access_token, isAuthenticated: true });
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userStr = await AsyncStorage.getItem('user');
      
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
    }
  },
}));
