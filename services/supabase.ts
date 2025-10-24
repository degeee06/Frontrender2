import { createClient, Session, SupabaseClient } from "@supabase/supabase-js";
import { Capacitor } from '@capacitor/core';

// These values are hardcoded as per the original script's approach.
// In a production environment, they should be environment variables.
const SUPABASE_URL = "https://otyxjcxxqwjotnuyrvmc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90eXhqY3h4cXdqb3RudXlydm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzU5MTQsImV4cCI6MjA3MzAxMTkxNH0.O6pWtKMQvsIQlOt7G6nIcDMMKoTJU-G-qpZiiE6Q3Hk";

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const getRedirectUrl = (): string => {
  if (Capacitor.isNativePlatform()) {
    // This should match the custom scheme you configure in your native project.
    return 'com.oubook.agendamento://auth-callback';
  }
  // For web, use the standard origin.
  return window.location.origin;
};

export const signInWithGoogle = async (): Promise<void> => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getRedirectUrl(),
      // For Capacitor, we might need to handle the browser part ourselves
      // but Supabase's library has improved support for this. This setup is generally robust.
    },
  });
  if (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

export const getSession = async (): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Error getting session:", error);
    return null;
  }
  return data.session;
};
