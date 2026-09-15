import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';

export interface Membership {
  id: string;
  classroom_id: string;
  classroom_name: string;
  classroom_slug: string;
  role: 'OWNER' | 'CO_TEACHER' | 'TA' | 'STUDENT';
  group_id?: string;
  group_name?: string;
  student_id?: string;
}

export interface UserProfile {
  id: string;
  email_normalized: string;
  email_raw: string;
  display_name?: string;
  status: string;
  memberships: Membership[];
}

export interface NotificationItem {
  id: string;
  type: string;
  payload: Record<string, any>;
  sent_at: string;
  read_at?: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  activeClassroom: Membership | null;
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  isLoading: boolean;
  login: (email: string, displayName?: string, classroomId?: string) => Promise<void>;
  logout: () => void;
  setActiveClassroom: (mem: Membership | null) => void;
  refreshProfile: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeClassroom, setActiveClassroom] = useState<Membership | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await fetchApi<{ notifications: NotificationItem[]; unread_count: number }>('/notifications');
      setNotifications(res.notifications || []);
      setUnreadNotificationCount(res.unread_count || 0);
    } catch {
      // ignore if not logged in
    }
  };

  const refreshProfile = async () => {
    try {
      const profile = await fetchApi<UserProfile>('/auth/me');
      setUser(profile);
      if (profile.memberships.length > 0 && !activeClassroom) {
        setActiveClassroom(profile.memberships[0]);
      }
      await fetchNotifications();
    } catch {
      localStorage.removeItem('paireval_token');
      setUser(null);
      setActiveClassroom(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('paireval_token');
    if (token) {
      refreshProfile();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, displayName?: string, classroomId?: string) => {
    setIsLoading(true);
    try {
      const res = await fetchApi<{ access_token: string; user: UserProfile }>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ email, display_name: displayName, classroom_id: classroomId }),
      });
      localStorage.setItem('paireval_token', res.access_token);
      setUser(res.user);
      if (res.user.memberships.length > 0) {
        if (classroomId) {
          const match = res.user.memberships.find(m => m.classroom_id === classroomId);
          setActiveClassroom(match || res.user.memberships[0]);
        } else {
          setActiveClassroom(res.user.memberships[0]);
        }
      }
      await fetchNotifications();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('paireval_token');
    localStorage.removeItem('paireval_offline_queue');
    setUser(null);
    setActiveClassroom(null);
    setNotifications([]);
    setUnreadNotificationCount(0);
  };

  const markNotificationRead = async (id: string) => {
    try {
      await fetchApi(`/notifications/${id}:read`, { method: 'POST' });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadNotificationCount(prev => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeClassroom,
        notifications,
        unreadNotificationCount,
        isLoading,
        login,
        logout,
        setActiveClassroom,
        refreshProfile,
        fetchNotifications,
        markNotificationRead,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
