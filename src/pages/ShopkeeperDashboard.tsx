// src/pages/ShopkeeperDashboard.tsx
import React, { useEffect, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import QRCodeGenerator from "@/components/QRCodeGenerator";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MapPicker from "@/components/MapPicker";
import ProductForm from "@/components/ProductForm";

/**
 * Local, small types to avoid relying on the large generated Supabase types
 * which sometimes cause the "Type instantiation is excessively deep" TS error.
 */
type ShopRow = {
  id: string;
  owner_id: string;
  name: string;
  address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  category?: string | null;
  image_url?: string | null;
};

type Token = {
  id: string;
  token_number: number;
  status: string;
  created_at: string;
  customer_id?: string | null;
};

type Product = {
  id: string;
  name: string;
  description?: string;
  price?: number;
  image_url?: string | null;
  created_at?: string;
};

const ShopkeeperDashboard: React.FC = () => {
  const [shop, setShop] = useState<ShopRow | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // supabase.auth.getSession() returns { data, error }
        const { data: sessionData } = await supabase.auth.getSession();
        const session = (sessionData as any)?.session ?? null;
        if (!session) {
          if (mounted) {
            setLoading(false);
            setShop(null);
            setTokens([]);
            setProducts([]);
          }
          return;
        }
        const userId = session.user.id;

        // cast supabase calls that rely on your generated types to `any`
        const { data: shopsData, error: shopsError } = await (supabase as any)
          .from("shops")
          .select("*")
          .eq("owner_id", userId)
          .limit(1);

        if (shopsError) throw shopsError;
        const s: ShopRow | null = (shopsData && shopsData[0]) ? (shopsData[0] as ShopRow) : null;
        if (mounted) setShop(s);

        if (s?.id) {
          // fetch tokens and products in parallel; cast to any to avoid TS errors
          const [toksRes, prodsRes] = await Promise.all([
            (supabase as any).from("tokens").select("*").eq("shop_id", s.id).order("created_at", { ascending: false }).limit(50),
            (supabase as any).from("products").select("*").eq("shop_id", s.id).order("created_at", { ascending: false }),
          ]);

          const toks = (toksRes?.data ?? []) as any[];
          const prods = (prodsRes?.data ?? []) as any[];

          const normalizedToks = toks.map((t: any) => ({
            id: t.id,
            token_number: typeof t.token_number === "number" ? t.token_number : Number(t.token_number || 0),
            status: t.status ?? "unknown",
            created_at: t.created_at ?? new Date().toISOString(),
            customer_id: t.customer_id ?? null,
          })) as Token[];

          const normalizedProds = prods.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description ?? "",
            price: typeof p.price === "number" ? p.price : Number(p.price ?? 0),
            image_url: p.image_url ?? null,
            created_at: p.created_at ?? undefined,
          })) as Product[];

          if (mounted) {
            setTokens(normalizedToks);
            setProducts(normalizedProds);
          }
        } else {
          // no shop for this user
          if (mounted) {
            setTokens([]);
            setProducts([]);
          }
        }
      } catch (err: any) {
        console.error("Error loading dashboard:", err);
        if (mounted) setError(err?.message ?? "Failed to load dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const refresh = async () => {
    if (!shop?.id) return;

    setLoading(true);
    setError(null);

    try {
      const toksRes = await (supabase as any)
        .from("tokens")
        .select("*")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false })
        .limit(50);
      const prodsRes = await (supabase as any)
        .from("products")
        .select("*")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false });

      const toks = (toksRes?.data ?? []) as any[];
      const prods = (prodsRes?.data ?? []) as any[];

      const normalizedToks = toks.map((t: any) => ({
        id: t.id,
        token_number: typeof t.token_number === "number" ? t.token_number : Number(t.token_number || 0),
        status: t.status ?? "unknown",
        created_at: t.created_at ?? new Date().toISOString(),
        customer_id: t.customer_id ?? null,
      })) as Token[];

      const normalizedProds = prods.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? "",
        price: typeof p.price === "number" ? p.price : Number(p.price ?? 0),
        image_url: p.image_url ?? null,
        created_at: p.created_at ?? undefined,
      })) as Product[];

      setTokens(normalizedToks);
      setProducts(normalizedProds);
    } catch (err: any) {
      console.error("Refresh error:", err);
      setError(err?.message ?? "Failed to refresh data");
    } finally {
      setLoading(false);
    }
  };

  const markServed = async (id: string) => {
    try {
      // RLS will protect this; cast to any to avoid generated types problems
      const { error } = await (supabase as any).from("tokens").update({ status: "served" }).eq("id", id);
      if (error) throw error;
      // refresh after marking served
      await refresh();
    } catch (err: any) {
      console.error("Failed to mark served:", err);
      setError(err?.message ?? "Failed to update token");
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-5xl mx-auto py-12 space-y-6">
        <h2 className="text-3xl font-bold">Shopkeeper Dashboard</h2>

        {loading && <p>Loading...</p>}
        {error && <p className="text-sm text-destructive">Error: {error}</p>}

        {!loading && !shop && <p>No shop found for your account. Create a shop from the Shopkeeper page.</p>}

        {shop && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{shop.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">Owner: {shop.owner_id}</p>
                <p className="text-sm">Address: {shop.address ?? "—"}</p>

                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Shop location</h4>
                  <div className="h-64">
                    <MapPicker value={{ lat: shop.location_lat ?? undefined, lng: shop.location_lng ?? undefined }} readOnly />
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Shop QR</h4>
                  <QRCodeGenerator value={JSON.stringify({ shop_id: shop.id, shop_name: shop.name })} size={160} />
                </div>
              </CardContent>
            </Card>

            <div>
              <h3 className="text-2xl font-semibold mt-6 mb-3">Add Product</h3>
              <ProductForm shopId={shop.id} onCreated={refresh} />
            </div>

            <div>
              <h3 className="text-2xl font-semibold mt-6 mb-3">Products</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {products.map((p) => (
                  <Card key={p.id}>
                    <CardHeader>
                      <CardTitle>
                        {p.name} <span className="text-sm text-muted-foreground"> - ₹{p.price ?? "—"}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-28 h-28 object-cover rounded" />
                        ) : (
                          <div className="w-28 h-28 bg-muted rounded" />
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground">{p.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-semibold mt-6 mb-3">Latest Tokens</h3>
              <div className="grid grid-cols-1 gap-3">
                {tokens.map((t) => (
                  <Card key={t.id}>
                    <CardHeader>
                      <CardTitle>#{t.token_number} — {t.status}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">Customer: {t.customer_id ?? "—"}</p>
                        <p className="text-sm">Created: {new Date(t.created_at).toLocaleString()}</p>
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={() => markServed(t.id)}>Mark Served</Button>
                        <QRCodeGenerator value={JSON.stringify({ token_id: t.id })} size={96} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ShopkeeperDashboard;
