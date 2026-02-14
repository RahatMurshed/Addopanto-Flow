import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Listen for user_roles deletion to detect when current user is deleted and force logout
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-role-deletion')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          console.log('User role deleted, forcing logout');
          await supabase.auth.signOut({ scope: 'local' });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fallback: periodically validate session in case Realtime misses the deletion event
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      // Check if user has a role first (approved users)
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleData) {
        // User has a role — just validate auth session
        const { error } = await supabase.auth.getUser();
        if (error) {
          console.log('Session validation failed, forcing logout:', error.message);
          await supabase.auth.signOut({ scope: 'local' });
        }
        return;
      }

      // No role — check registration request status
      const { data: regData } = await supabase
        .from("registration_requests")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      // Pending users stay on /pending page
      if (regData?.status === "pending") {
        return;
      }

      // Rejected users get forced logout immediately
      if (regData?.status === "rejected") {
        console.log('User rejected, forcing logout');
        await supabase.auth.signOut({ scope: 'local' });
        return;
      }

      // No role and no registration request — force logout
      console.log('User role not found, forcing logout');
      await supabase.auth.signOut({ scope: 'local' });

      // Validate auth session
      const { error } = await supabase.auth.getUser();
      if (error) {
        console.log('Session validation failed, forcing logout:', error.message);
        await supabase.auth.signOut({ scope: 'local' });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [user]);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: fullName ? { full_name: fullName } : undefined,
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
