"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabasePublicConfigured } from "@/lib/supabase/config";
import {
  getCurrentMusicUserState,
  hasGoogleIdentity,
  signOutMusicUser,
  syncMusicLoginSession,
} from "@/lib/music-auth";
import { reportClientError } from "@/lib/errors";
import type { Creator, MusicUser, MusicUserPreferences } from "@/types/music";

interface AuthContextValue {
  user: User | null;
  musicUser: MusicUser | null;
  creator: Creator | null;
  preferences: MusicUserPreferences | null;
  isGoogleAuthenticated: boolean;
  loading: boolean;
  refreshAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  musicUser: null,
  creator: null,
  preferences: null,
  isGoogleAuthenticated: false,
  loading: true,
  refreshAuth: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [musicUser, setMusicUser] = useState<MusicUser | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [preferences, setPreferences] = useState<MusicUserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const loadState = useCallback(async (syncIfMissing = false) => {
    if (!isSupabasePublicConfigured()) {
      setLoading(false);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      setUser(authUser || null);
      if (!authUser) {
        setMusicUser(null);
        setCreator(null);
        setPreferences(null);
        return;
      }

      let state = await getCurrentMusicUserState();
      if (!state.musicUser && syncIfMissing) {
        const provider = hasGoogleIdentity(authUser)
          ? "google"
          : (authUser.app_metadata?.provider as "email" | "oauth" | undefined) || "session_resume";
        await syncMusicLoginSession(provider);
        state = await getCurrentMusicUserState();
      }

      const { data: creatorRow } = await supabase
        .from("creators")
        .select("*")
        .eq("user_id", authUser.id)
        .maybeSingle();

      setMusicUser(state.musicUser);
      setPreferences(state.preferences);
      setCreator((creatorRow as Creator | null) || null);
    } catch (err) {
      reportClientError("AuthContext.loadState", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) void loadState(true);
    });

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return () => {
        active = false;
      };
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        void loadState(true);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setMusicUser(null);
        setCreator(null);
        setPreferences(null);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadState]);

  const signOut = useCallback(async () => {
    await signOutMusicUser();
    setUser(null);
    setMusicUser(null);
    setCreator(null);
    setPreferences(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        musicUser,
        creator,
        preferences,
        isGoogleAuthenticated: hasGoogleIdentity(user),
        loading,
        refreshAuth: () => loadState(false),
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
