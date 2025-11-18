// src/pages/Auth.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type UserType = "customer" | "shopkeeper" | null;

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [userType, setUserType] = useState<UserType>(null);

  useEffect(() => {
    // Check session on mount
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = (data as any)?.session ?? null;
        if (session) {
          const uid = session.user.id;
          await checkUserRoleAndNavigate(uid);
        }
      } catch (err) {
        console.error("Error checking session:", err);
      }
    })();

    // Subscribe to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        checkUserRoleAndNavigate(session.user.id).catch((e) => console.error(e));
      }
      if (event === "SIGNED_OUT") {
        // optional: navigate to landing / browse
      }
    });

    return () => {
      // cleanup
      try {
        authListener?.subscription?.unsubscribe?.();
      } catch (err) {
        // best-effort cleanup
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUserRoleAndNavigate = async (userId: string) => {
    try {
      // Get roles for the user. There might be zero or multiple rows (older data).
      const { data: rolesData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching roles:", error);
        // fallback to browse
        navigate("/browse");
        return;
      }

      const roles = Array.isArray(rolesData) ? rolesData.map((r: any) => r.role) : [];
      // Prefer shopkeeper if present
      if (roles.includes("shopkeeper")) {
        navigate("/shopkeeper/dashboard");
      } else {
        // default to browse
        navigate("/browse");
      }
    } catch (err) {
      console.error("checkUserRoleAndNavigate error:", err);
      navigate("/browse");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      const user = (data as any).user;
      toast({
        title: "Success",
        description: "Logged in successfully!",
      });

      if (user) {
        await checkUserRoleAndNavigate(user.id);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: error.message || "Login failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userType) {
      toast({
        title: "Error",
        description: "Please select whether you are a customer or shopkeeper",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Sign up the user
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/browse`,
          data: {
            full_name: signupName,
          },
        },
      });

      if (signupError) throw signupError;

      const user = (signupData as any)?.user ?? null;

      // If user object exists, attempt role insertion/upsert logic.
      if (user && user.id) {
        const userId = user.id;

        // First attempt to insert the role. If a unique constraint / conflict occurs,
        // fall back to update. This handles the case where the DB may or may not have
        // a unique constraint yet (legacy data).
        try {
          const { error: insertErr } = await supabase.from("user_roles").insert({
            user_id: userId,
            role: userType,
          });

          if (insertErr) {
            // If unique constraint violation (duplicate user_id), try update instead
            const msg = (insertErr as any)?.message ?? "";
            console.warn("Role insert error, will attempt update:", insertErr);
            if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique") || (insertErr as any)?.code === "23505") {
              const { error: updErr } = await supabase
                .from("user_roles")
                .update({ role: userType })
                .eq("user_id", userId);

              if (updErr) {
                console.error("Role update also failed:", updErr);
                throw updErr;
              }
            } else {
              // Some other insertion error; escalate
              throw insertErr;
            }
          }

          // Upsert profile with name/email for convenience
          const { error: profileErr } = await supabase.from("profiles").upsert(
            {
              id: userId,
              email: signupEmail,
              full_name: signupName,
            },
            { onConflict: "id" }
          );

          if (profileErr) {
            console.warn("Profile upsert warning:", profileErr);
          }

          toast({
            title: "Success",
            description: `Account created successfully as a ${userType}! Check your email to confirm and then log in.`,
          });

          // Clear form
          setSignupEmail("");
          setSignupPassword("");
          setSignupName("");
          setUserType(null);
        } catch (roleErr: any) {
          console.error("Role assignment error:", roleErr);
          // Give an informative message: account is created but role assignment failed.
          toast({
            title: "Warning",
            description: `Account created but role assignment had an issue. Please try logging in. ${roleErr.message || ""}`,
            variant: "destructive",
          });
        }
      } else {
        // No user object returned (possible in some flows: email confirmation required)
        toast({
          title: "Info",
          description: "A confirmation email was sent. After confirming, please log in and complete your profile.",
        });
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: "Error",
        description: error.message || "Signup failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Welcome Back
          </CardTitle>
          <CardDescription>Login or create an account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Login
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                {/* User Type Selection */}
                <div className="space-y-3 pt-2 border-t">
                  <Label>I am a:</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={userType === "customer" ? "default" : "outline"}
                      onClick={() => setUserType("customer")}
                      className="w-full"
                    >
                      Customer
                    </Button>
                    <Button
                      type="button"
                      variant={userType === "shopkeeper" ? "default" : "outline"}
                      onClick={() => setUserType("shopkeeper")}
                      className="w-full"
                    >
                      Shopkeeper
                    </Button>
                  </div>
                  {!userType && <p className="text-xs text-red-500">Please select your account type</p>}
                </div>

                <Button type="submit" className="w-full" disabled={loading || !userType}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign Up
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
