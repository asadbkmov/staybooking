import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Auto-assign role to user after auth
  const ensureUserRole = useCallback(async (userId: string, email: string) => {
    try {
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!existingRole) {
        // Determine role based on email or default to 'user'
        const role = email === 'admin@example.com' ? 'admin' : 'user'; // Replace with your admin email
        
        await supabase.from('user_roles').insert({
          user_id: userId,
          role
        });
      }
    } catch (error) {
      console.error('Error ensuring user role:', error);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      
      // Auto-assign role on sign in/up
      if (s?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        setTimeout(() => {
          ensureUserRole(s.user.id, s.user.email || '');
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);

      // Auto-assign role on initial load if user exists
      if (data.session?.user) {
        setTimeout(() => {
          ensureUserRole(data.session.user.id, data.session.user.email || '');
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [ensureUserRole]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { user, session, loading, signIn, signUp, signOut };
}
