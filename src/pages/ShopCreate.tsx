// src/pages/ShopCreate.tsx
import React, { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import MapPicker from "@/components/MapPicker";
import { useNavigate } from "react-router-dom";
import { LoadScript, Autocomplete } from "@react-google-maps/api";
import { useAuth } from "@/hooks/useAuth";

const MAP_LIBS = ["places"] as readonly string[];

type PayoutMethod = "bank" | "upi" | "none";

const ShopCreate: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("general");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>("none");
  const [bankAccount, setBankAccount] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [upiId, setUpiId] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const autocompleteRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Prefill owner name from user metadata
  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setOwnerName(user.user_metadata.full_name);
    }
  }, [user]);

  // Address autocomplete handlers
  const onAddressInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
  };

  const onPlaceChanged = () => {
    try {
      const ac = autocompleteRef.current;
      if (!ac) return;

      const getPlaceFn = (ac as any).getPlace;
      const place = typeof getPlaceFn === "function" ? getPlaceFn() : undefined;
      const rawPlace = place ?? (ac as any).place ?? (ac as any).getPlace?.();
      if (!rawPlace) return;

      const p: any = rawPlace;
      const formatted = p.formatted_address ?? p.name ?? inputRef.current?.value ?? "";
      setAddress(formatted);

      const loc = p.geometry?.location;
      if (loc && typeof loc.lat === "function" && typeof loc.lng === "function") {
        setLat(loc.lat());
        setLng(loc.lng());
      } else if (p.geometry?.location && typeof p.geometry.location.lat === "number" && typeof p.geometry.location.lng === "number") {
        setLat(p.geometry.location.lat);
        setLng(p.geometry.location.lng);
      } else if (p.latitude && p.longitude) {
        setLat(Number(p.latitude));
        setLng(Number(p.longitude));
      }
    } catch (err) {
      console.error("onPlaceChanged error:", err);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setAddress("Current location (approx.)");
      },
      (err) => {
        console.error("geolocation error", err);
        alert("Could not get your location. Allow location access or pick on the map.");
      },
      { enableHighAccuracy: true }
    );
  };

  const onMapPick = (pickedLat: number, pickedLng: number) => {
    setLat(pickedLat);
    setLng(pickedLng);
    setAddress(`Picked: ${pickedLat.toFixed(6)}, ${pickedLng.toFixed(6)}`);
  };

  // ---------- Client-side validators ----------
  const validatePhone = (value: string) => {
    // Cover many international formats loosely, prefer digits and optional +, spaces, hyphens
    const cleaned = value.replace(/[\s-]/g, "");
    return /^[+0-9]{7,15}$/.test(cleaned);
  };

  const validateIFSC = (value: string) => {
    // Indian IFSC pattern: 4 letters + 0 + 6 alphanum
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.trim().toUpperCase());
  };

  const validateAccountNumber = (value: string) => {
    const cleaned = value.replace(/\s+/g, "");
    return /^[0-9]{6,20}$/.test(cleaned); // many banks have 9-18 digits, accept 6-20 to be flexible
  };

  const validateUpi = (value: string) => {
    // simple UPI id check: <name>@<provider>
    return /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{3,}$/.test(value.trim());
  };

  // ---------- Submit handler ----------
  const createShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!user) {
      setErrorMsg("Please sign in first.");
      return;
    }
    if (!name) {
      setErrorMsg("Enter shop name.");
      return;
    }
    if (!ownerName) {
      setErrorMsg("Please enter owner full name.");
      return;
    }
    if (!phone || !validatePhone(phone)) {
      setErrorMsg("Please enter a valid phone number (digits, + allowed).");
      return;
    }
    if (!lat || !lng) {
      setErrorMsg("Please select shop location on the map or use your current location.");
      return;
    }

    // Payout-specific validation when payout is requested
    if (payoutMethod === "bank") {
      if (!accountHolderName) {
        setErrorMsg("Please provide account holder name for bank payout.");
        return;
      }
      if (!bankAccount || !validateAccountNumber(bankAccount)) {
        setErrorMsg("Please provide a valid bank account number (6-20 digits).");
        return;
      }
      if (!ifsc || !validateIFSC(ifsc)) {
        setErrorMsg("Please provide a valid IFSC (e.g. ABCD0XXXXX).");
        return;
      }
    } else if (payoutMethod === "upi") {
      if (!upiId || !validateUpi(upiId)) {
        setErrorMsg("Please provide a valid UPI ID (example: name@bank).");
        return;
      }
    }

    setLoading(true);

    try {
      // If any payout detail is provided, use the RPC which will encrypt sensitive fields server-side.
      const payloadBase = {
        owner_id: user.id,
        name,
        description: null,
        category,
        location_lat: lat,
        location_lng: lng,
        address,
      };

      if (payoutMethod === "bank" || payoutMethod === "upi") {
        // Call RPC: insert_shop_with_payout
        const { data: rpcData, error: rpcError } = await (supabase as any).rpc("insert_shop_with_payout", {
          owner_id: payloadBase.owner_id,
          name: payloadBase.name,
          description: payloadBase.description,
          category: payloadBase.category,
          location_lat: payloadBase.location_lat,
          location_lng: payloadBase.location_lng,
          address: payloadBase.address,
          payout_method: payoutMethod,
          owner_full_name: ownerName,
          phone,
          // pass payout plaintext to RPC; RPC will encrypt server-side
          bank_account: payoutMethod === "bank" ? bankAccount.replace(/\s+/g, "") : null,
          account_holder_name: payoutMethod === "bank" ? accountHolderName : null,
          ifsc: payoutMethod === "bank" ? ifsc.trim().toUpperCase() : null,
          upi_id: payoutMethod === "upi" ? upiId.trim() : null,
        });
        if (rpcError) throw rpcError;
        // rpcData should be the inserted shop row
      } else {
        // No payout details — simple insert into shops
        const { data, error } = await (supabase as any).from("shops").insert(payloadBase).select().single();
        if (error) throw error;
      }

      // Optionally: update profile with ownerName and phone
      await (supabase as any).from("profiles").upsert({ id: user.id, full_name: ownerName, phone }, { onConflict: "id" });

      navigate("/shopkeeper/dashboard");
    } catch (err: any) {
      console.error("createShop error:", err);
      setErrorMsg(err?.message ?? "Failed to create shop.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Header />
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="bg-card p-6 rounded-xl shadow space-y-6">
          {authLoading ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : !user ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-600 mb-4">Please sign in to create a shop.</p>
              <button 
                onClick={() => navigate("/auth")} 
                className="btn btn-primary"
              >
                Sign In
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold">Create your Shop</h2>
              <p className="text-sm text-muted-foreground">Fill shop details — use address autocomplete, your location, or pick on the map. Provide payout details if you want to receive online payments.</p>

              <LoadScript
                googleMapsApiKey={String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "")}
                libraries={MAP_LIBS as any}
                onLoad={() => setMapsLoaded(true)}
                onError={(err) => {
                  console.error("Maps load error:", err);
                  setMapsLoaded(false);
                }}
              >
                <form onSubmit={createShop} className="space-y-4">
              {/* Basic shop details */}
              <div>
                <label className="block text-sm font-medium mb-1">Shop name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full input" placeholder="My Pharmacy" required />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Owner full name</label>
                <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full input" placeholder="John Doe" required />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Owner phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full input" placeholder="+911234567890" required />
                <p className="text-xs text-muted-foreground mt-1">Use international format (digits, + allowed). We'll use this to contact you and verify payouts.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="input w-full">
                  <option value="grocery">Grocery</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="electronics">Electronics</option>
                  <option value="apparel">Apparel</option>
                  <option value="food">Food</option>
                  <option value="general">General</option>
                </select>
              </div>

              {/* Address / Autocomplete */}
              <div>
                <label className="block text-sm font-medium mb-1">Address / Search</label>

                {mapsLoaded ? (
                  <Autocomplete
                    onLoad={(ac) => {
                      autocompleteRef.current = ac;
                    }}
                    onPlaceChanged={onPlaceChanged}
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={address}
                      onChange={onAddressInput}
                      placeholder="Start typing address..."
                      className="input w-full"
                      aria-label="Search address"
                    />
                  </Autocomplete>
                ) : (
                  <input
                    type="text"
                    value={address}
                    onChange={onAddressInput}
                    placeholder="Start typing address..."
                    className="input w-full"
                    aria-label="Address"
                  />
                )}

                <div className="mt-2 flex gap-2">
                  <button type="button" className="btn btn-outline" onClick={useCurrentLocation}>
                    Use my location
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setAddress("");
                      setLat(null);
                      setLng(null);
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Map picker */}
              <div>
                <label className="block text-sm font-medium mb-1">Pick on map</label>
                <div className="h-64 rounded overflow-hidden border">
                  <MapPicker value={lat && lng ? { lat, lng } : undefined} onChange={onMapPick} />
                </div>
                <div className="text-sm text-muted-foreground mt-2">{lat && lng ? `Selected: ${lat.toFixed(6)}, ${lng.toFixed(6)}` : "Click the map to pick location"}</div>
              </div>

              {/* Payout details */}
              <div className="pt-2 border-t">
                <h3 className="text-lg font-medium">Payout / Payment details</h3>
                <p className="text-sm text-muted-foreground">Provide payout info if you want to receive online transfers. We encrypt sensitive fields server-side.</p>

                <div className="mt-2">
                  <label className="block text-sm font-medium mb-1">Payout method</label>
                  <select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value as PayoutMethod)} className="input w-full">
                    <option value="none">Do not add payout details now</option>
                    <option value="bank">Bank transfer (account + IFSC)</option>
                    <option value="upi">UPI ID</option>
                  </select>
                </div>

                {payoutMethod === "bank" && (
                  <div className="space-y-3 mt-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Account holder name</label>
                      <input value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} className="input w-full" placeholder="Account holder name" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Bank account number</label>
                      <input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className="input w-full" placeholder="123456789012" />
                      <p className="text-xs text-muted-foreground mt-1">We'll store your account details encrypted and only use them to process payouts.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">IFSC code</label>
                      <input value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} className="input w-full" placeholder="ABCD0XXXXXX" />
                    </div>
                  </div>
                )}

                {payoutMethod === "upi" && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">UPI ID</label>
                      <input value={upiId} onChange={(e) => setUpiId(e.target.value)} className="input w-full" placeholder="name@bank" />
                      <p className="text-xs text-muted-foreground mt-1">Example UPI ID: name@bank</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Error */}
              {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}

              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Creating..." : "Create Shop"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => navigate("/shopkeeper/dashboard")}>
                  Cancel
                </button>
              </div>
            </form>
          </LoadScript>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopCreate;
