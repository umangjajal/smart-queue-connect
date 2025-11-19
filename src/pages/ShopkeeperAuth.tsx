import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ShopkeeperAuth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = (data as any)?.session ?? null;
        if (session) {
          await checkUserRoleAndNavigate(session.user.id);
        }
      } catch (err) {
        console.error("Error checking session:", err);
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        checkUserRoleAndNavigate(session.user.id).catch((e) => console.error(e));
      }
    });

    return () => {
      try {
        authListener?.subscription?.unsubscribe?.();
      } catch (err) {
        // cleanup
      }
    };
  }, []);

  const checkUserRoleAndNavigate = async (userId: string) => {
    try {
      const { data: rolesData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching roles:", error);
        navigate("/browse");
        return;
      }

      const roles = Array.isArray(rolesData) ? rolesData.map((r: any) => r.role) : [];
      if (roles.includes("shopkeeper") || roles.includes("admin")) {
        // Check if shopkeeper has a shop
        const { data: shops } = await supabase
          .from("shops")
          .select("id")
          .eq("owner_id", userId)
          .limit(1);

        if (shops && shops.length > 0) {
          navigate("/shopkeeper/dashboard");
        } else {
          navigate("/shopkeeper/create");
        }
      } else {
        navigate("/browse");
      }
    } catch (err) {
      console.error("checkUserRoleAndNavigate error:", err);
      navigate("/browse");
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/shopkeeper/dashboard`,
        },
      });

      if (error) throw error;

      setOtpSent(true);
      toast({
        title: "Success",
        description: "OTP sent to your email! Check your inbox.",
      });
    } catch (error: any) {
      console.error("OTP send error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (error) throw error;

      const user = (data as any).user;
      if (user) {
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (!rolesData || rolesData.length === 0) {
          await supabase.from("user_roles").insert({
            user_id: user.id,
            role: "shopkeeper",
          });
        }

        toast({
          title: "Success",
          description: "Logged in successfully!",
        });

        await checkUserRoleAndNavigate(user.id);
      }
    } catch (error: any) {
      console.error("OTP verification error:", error);
      toast({
        title: "Error",
        description: error.message || "Invalid OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">Shopkeeper Login</CardTitle>
          <CardDescription className="text-center">
            Login with Email OTP Verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!otpSent ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send OTP
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  OTP sent to {email}
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify OTP
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                }}
              >
                Change Email
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Are you a customer?{" "}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate("/auth")}
              >
                Login here
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
