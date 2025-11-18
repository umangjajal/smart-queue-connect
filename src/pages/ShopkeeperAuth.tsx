// src/pages/ShopkeeperAuth.tsx
import React, { useEffect, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const ShopkeeperAuth: React.FC = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id ?? null;
      const { data: userData } = await supabase.auth.getUser();
      const maybeUser = (userData as any)?.data?.user ?? (userData as any)?.user ?? null;
      if (mounted) setUser(maybeUser);
    })();
    return () => { mounted = false; };
  }, []);

  const toggleMode = () => {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setError(null);
    setMessage(null);
  };

  const resendVerification = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: resendErr } = await supabase.auth.signInWithOtp({ email });
      if (resendErr) throw resendErr;
      setMessage("Verification email resent. Check your inbox (and spam).");
    } catch (err: any) {
      setError(err.message ?? "Failed to resend verification");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: "" } },
        });
        if (error) throw error;
        setMessage("Account created. A verification email was sent — confirm your email to continue.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // get latest user info
        const { data: userData } = await supabase.auth.getUser();
        const currentUser = (userData as any)?.data?.user ?? (userData as any)?.user ?? null;
        setUser(currentUser);

        const uid = (data as any)?.session?.user?.id ?? currentUser?.id ?? null;
        if (uid) {
          const { data: shops } = await (supabase as any).from("shops").select("id").eq("owner_id", uid).limit(1);
          const isConfirmed = currentUser?.email_confirmed_at ?? null;

          if (isConfirmed) {
            if (shops?.length) navigate("/shopkeeper/dashboard");
            else navigate("/shopkeeper/create");
          } else {
            setMessage("Email not verified. Please check your inbox. You cannot create a shop until you verify your email.");
          }
        } else {
          navigate("/shopkeeper/dashboard");
        }
      }
    } catch (err: any) {
      setError(err.message ?? "Auth error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Header />
      <div className="max-w-md mx-auto py-16 px-4">
        <div className="bg-card p-8 rounded-xl shadow">
          <h2 className="text-2xl font-bold mb-2">{mode === "signin" ? "Shopkeeper Sign In" : "Create Shopkeeper Account"}</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "signin" ? "Access your shop dashboard" : "Create an account to manage your shop"}
          </p>

          {message && <div className="text-sm text-foreground mb-4">{message}</div>}
          {error && <div className="text-sm text-destructive mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full input"
                placeholder="you@business.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full input"
                placeholder="Choose a strong password"
              />
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
              </button>

              {mode === "signin" ? (
                <button type="button" className="btn btn-ghost" onClick={toggleMode} disabled={loading}>
                  Create account
                </button>
              ) : (
                <button type="button" className="btn btn-ghost" onClick={toggleMode} disabled={loading}>
                  Sign in instead
                </button>
              )}
            </div>
          </form>

          <div className="mt-4 text-sm text-muted-foreground">
            If you signed up, check your email (including spam) and verify. After email verification, sign in and create your shop.
          </div>

          <div className="mt-4 flex gap-2">
            <button className="btn btn-outline" onClick={resendVerification} disabled={loading || !email}>
              Resend verification email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopkeeperAuth;
