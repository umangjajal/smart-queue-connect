// src/components/ProductForm.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import debounce from "lodash.debounce";

type Props = {
  shopId: string;
  onCreated?: () => void;
};

type CatalogItem = {
  id: string;
  name: string;
  category: string;
  brand?: string;
  description?: string;
  default_price?: number;
};

const ProductForm: React.FC<Props> = ({ shopId, onCreated }) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CatalogItem[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogItem | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState<string>("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // debounced search to product_catalog
  const searchCatalog = useMemo(() => debounce(async (q: string) => {
    if (!q || q.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      // cast supabase to any until types are regenerated
      const res = await (supabase as any)
        .from("product_catalog")
        .select("*")
        .ilike("name", `%${q}%`)
        .limit(10);
      const list = (res?.data ?? []) as any[];
      setSuggestions(list.map((l) => ({
        id: l.id,
        name: l.name,
        category: l.category,
        brand: l.brand,
        description: l.description,
        default_price: l.default_price,
      })));
    } catch (err) {
      console.error("catalog search error", err);
      setSuggestions([]);
    }
  }, 300), []);

  useEffect(() => {
    searchCatalog(query);
    return () => { searchCatalog.cancel(); };
  }, [query, searchCatalog]);

  useEffect(() => {
    if (selectedCatalog) {
      setName(selectedCatalog.name);
      setDescription(selectedCatalog.description ?? "");
      setPrice(selectedCatalog.default_price ? String(selectedCatalog.default_price) : "");
      setSuggestions([]);
      setQuery("");
    }
  }, [selectedCatalog]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) setPreviewUrl(URL.createObjectURL(f));
    else setPreviewUrl(null);
  };

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return alert("Enter product name");
    setLoading(true);

    try {
      let imageUrl: string | null = null;
      if (file) {
        const timestamp = Date.now();
        const ext = file.name.split(".").pop() ?? "jpg";
        const filename = `${timestamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const path = `products/${shopId}/${filename}`;

        const storage = (supabase as any).storage;
        const uploadResult = await storage.from("product-images").upload(path, file, { cacheControl: "3600", upsert: false });
        if (uploadResult?.error) throw uploadResult.error;

        const publicUrlRes = storage.from("product-images").getPublicUrl(path);
        imageUrl = publicUrlRes?.data?.publicUrl ?? publicUrlRes?.publicUrl ?? null;
      }

      const payload = {
        shop_id: shopId,
        name,
        description,
        price: Number(price || 0),
        image_url: imageUrl,
      };

      const { data, error } = await (supabase as any).from("products").insert(payload).select().single();
      if (error) throw error;

      setName("");
      setPrice("");
      setDescription("");
      setFile(null);
      setPreviewUrl(null);
      setSelectedCatalog(null);
      onCreated && onCreated();
    } catch (err: any) {
      alert(err.message ?? "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={createProduct} className="space-y-3 bg-card p-4 rounded">
        <div>
          <label className="text-sm block mb-1">Search catalog (or type to add custom)</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input w-full"
            placeholder="Search product catalog (e.g., 'paracetamol', 'rice')"
          />
          {suggestions.length > 0 && (
            <div className="bg-white border rounded mt-1 max-h-60 overflow-auto z-20">
              {suggestions.map((s) => (
                <div key={s.id} className="p-2 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedCatalog(s)}>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.brand ?? s.category}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-sm block mb-1">Product name</label>
          <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div>
          <label className="text-sm block mb-1">Price</label>
          <input className="input w-full" value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" step="0.01" />
        </div>

        <div>
          <label className="text-sm block mb-1">Description</label>
          <textarea className="input w-full" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <label className="text-sm block mb-1">Image (optional)</label>
          <input type="file" accept="image/*" onChange={onFileChange} />
          {previewUrl && <img src={previewUrl} alt="preview" className="w-40 h-40 object-cover rounded-md border mt-2" />}
        </div>

        <div className="flex gap-3 items-center">
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Adding..." : "Add Product"}</button>
          <a href="mailto:support@example.com" className="text-sm text-muted-foreground">Need help? Contact support</a>
        </div>
      </form>

      <div className="text-xs mt-2 text-muted-foreground">
        Tip: use the search box to find items from our master catalog to speed up entry. If the exact product isn't present, type your product name and add it manually. For bulk uploads contact <a href="mailto:support@example.com">support@example.com</a> or call <a href="tel:+911234567890">+91 12345 67890</a>.
      </div>
    </div>
  );
};

export default ProductForm;
