import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// ✅ Strong role typing
type UserRole = 'admin' | 'ngo' | 'volunteer';

// ✅ Profile type
interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  address?: string;
  city?: string;
  avatar_url?: string;
  organization_name?: string;
  email?: string;
  disabled?: boolean;
  created_at?: string;
}

// ✅ Context type
interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, data: Partial<Profile>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ✅ Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ✅ Provider
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔥 Fetch profile
  const fetchProfile = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', error.message);
        return false;
      }

      // ✅ Auto-create profile if not exists
      if (!data) {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: 'User',
            role: 'volunteer',
          })
          .select()
          .single();

        if (insertError) {
          console.error('Profile insert error:', insertError.message);
          return false;
        }

        setProfile(newProfile);
        return true;
      }

      // ✅ Disabled user check
      if (data?.disabled) {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        return false;
      }

      setProfile(data);
      return true;
    } catch (err) {
      console.error('Unexpected error:', err);
      return false;
    }
  };

  // 🔥 Auth state listener
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        // background update
        supabase.from('profiles').upsert({
          id: session.user.id,
          email: session.user.email,
        });

        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    // Initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 🔥 SIGN UP
  const signUp = async (email: string, password: string, data: Partial<Profile>) => {
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: data.full_name,
          role: data.role,
        },
      },
    });

    if (error) {
      console.error(error.message);
      throw error;
    }

    if (authData.user) {
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        full_name: data.full_name || '',
        role: data.role || 'volunteer',
        organization_name: data.organization_name || null,
        phone: data.phone || null,
        city: data.city || null,
        email: authData.user.email,
      });
    }
  };

  // 🔥 SIGN IN
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(error.message);
      throw error;
    }

    if (data.user) {
      supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
      });

      fetchProfile(data.user.id);
    }
  };

  // 🔥 SIGN OUT
  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
  };

  // 🔥 Refresh profile
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ✅ Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};