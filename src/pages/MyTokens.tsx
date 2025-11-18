// src/pages/MyTokens.tsx
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import QRCodeGenerator from "@/components/QRCodeGenerator";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Token = {
  id: string;
  token_number: number;           // normalized to number
  status: string;
  created_at: string;
  shop_id?: string | null;
  expires_at?: string | null;     // optional now
};

const MyTokens = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        setTokens([]);
        setLoading(false);
        return;
      }

      const userId = session.session.user.id;

      const { data, error } = await supabase
        .from("tokens")
        .select("*")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        if (mounted) setTokens([]);
        setLoading(false);
        return;
      }

      // Normalize rows to our Token type
      const normalized = (data || []).map((t: any) => ({
        id: t.id,
        token_number: typeof t.token_number === "number" ? t.token_number : Number(t.token_number || 0),
        status: t.status ?? "unknown",
        created_at: t.created_at ?? new Date().toISOString(),
        shop_id: t.shop_id ?? null,
        expires_at: t.expires_at ?? null,
      })) as Token[];

      if (mounted) setTokens(normalized);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-4xl mx-auto py-12">
        <h2 className="text-3xl font-bold mb-6">My Tokens</h2>
        {loading && <p>Loading...</p>}
        {!loading && tokens.length === 0 && <p>You have no tokens yet.</p>}
        <div className="grid grid-cols-1 gap-4">
          {tokens.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle>Token #{t.token_number} — {t.status}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Created: {new Date(t.created_at).toLocaleString()}</p>
                  {t.shop_id && <p className="text-sm text-muted-foreground">Shop ID: {t.shop_id}</p>}
                </div>
                <div>
                  <QRCodeGenerator value={JSON.stringify({ token_id: t.id, token_number: t.token_number })} size={128} />
                </div>
                <div>
                  <Button variant="outline" onClick={() => navigator.clipboard.writeText(t.id)}>Copy ID</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyTokens;
