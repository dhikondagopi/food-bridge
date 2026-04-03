import {
  createContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

export { useAuth } from "@/hooks/useAuth";

export type UserRole = "restaurant" | "ngo" | "volunteer" | "admin";

export type Profile = {
  id: string;
  email?: string;
  role: UserRole;
  full_name?: string | null;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  avatar_url?: string | null;
  organization_name?: string | null;
  is_blocked?: boolean;
  is_active?: boolean;
  is_approved?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AuthUser = {
  id: string;
  email?: string;
};

export type AuthContextType = {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    role: UserRole,
    fullName?: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("fetchProfile:", error);
      setError(error.message);
      setProfile(null);
      return null;
    }

    const nextProfile = data as Profile | null;
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  const syncSession = useCallback(
    async (
      session: Awaited<
        ReturnType<typeof supabase.auth.getSession>
      >["data"]["session"]
    ) => {
      const sessionUser = session?.user;

      if (!sessionUser) {
        setUser(null);
        setProfile(null);
        return;
      }

      const authUser: AuthUser = {
        id: sessionUser.id,
        email: sessionUser.email,
      };

      setUser(authUser);
      await fetchProfile(authUser.id);
    },
    [fetchProfile]
  );

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("getSession:", error);
        setError(error.message);
      }

      try {
        await syncSession(session);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setTimeout(() => {
        if (!mounted) return;

        setLoading(true);
        setError(null);

        syncSession(session)
          .catch((err) => {
            console.error("syncSession:", err);
            setError(err instanceof Error ? err.message : "Auth sync failed");
          })
          .finally(() => {
            if (mounted) setLoading(false);
          });
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncSession]);

  const refreshProfile = async (): Promise<void> => {
    if (!user) return;
    setError(null);
    await fetchProfile(user.id);
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<void> => {
    if (!user) return;

    setError(null);

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      ...updates,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("updateProfile:", error);
      setError(error.message);
      toast.error(error.message);
      throw error;
    }

    await refreshProfile();
    toast.success("Profile updated");
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setError(null);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Login successful");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      console.error("signIn error:", err);
      setError(message);
      toast.error(message);
      throw err;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    role: UserRole,
    fullName?: string
  ): Promise<void> => {
    try {
      setError(null);

      const fallbackOrigin =
        typeof window !== "undefined" ? window.location.origin : "";
      const redirectUrl =
        import.meta.env.VITE_SITE_URL || `${fallbackOrigin}/auth/callback`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            full_name: fullName ?? null,
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      toast.success(
        "Signup successful. Check your email if confirmation is enabled."
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup failed";
      console.error("signUp error:", err);
      setError(message);
      toast.error(message);
      throw err;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setError(null);

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setProfile(null);

      toast.success("Logged out");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Logout failed";
      console.error("signOut error:", err);
      setError(message);
      toast.error(message);
      throw err;
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    loading,
    error,
    isAdmin: profile?.role === "admin",
    signIn,
    signUp,
    signOut,
    refreshProfile,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};