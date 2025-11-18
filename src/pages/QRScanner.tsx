// src/pages/QRScanner.tsx
import React, { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";

const QRScanner: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      (async () => {
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
          } catch (e) {
            // ignore
          }
          try {
            await scannerRef.current.clear();
          } catch (e) {
            // ignore
          }
        }
      })();
    };
  }, []);

  const startScanner = async () => {
    setMessage(null);
    setScanning(true);
    const qrcodeRegionId = "html5qr-code-full-region";
    const config = { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true };

    const html5QrCode = new Html5Qrcode(qrcodeRegionId);
    scannerRef.current = html5QrCode;

    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        async (decodedText: string) => {
          let tokenId = decodedText;
          try {
            const parsed = JSON.parse(decodedText);
            tokenId = parsed.token_id ?? parsed.id ?? tokenId;
          } catch (e) {
            // not JSON
          }

          setMessage(`Scanned: ${tokenId}, updating...`);
          try {
            // update token (RLS will enforce permissions)
            const { error } = await (supabase as any).from("tokens").update({ status: "served" }).eq("id", tokenId);
            if (error) setMessage(`Failed to update token: ${error.message}`);
            else setMessage("Token marked as served ✅");
          } catch (err: any) {
            setMessage(err.message ?? "Update failed");
          }

          try { await html5QrCode.stop(); } catch {}
          try { await html5QrCode.clear(); } catch {}
          setScanning(false);
        },
        (_errorMessage: string) => {
          // ignore decode errors
        }
      );
    } catch (err: any) {
      setMessage(err.message ?? "Unable to start camera");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      try { await scannerRef.current.clear(); } catch {}
    }
    setScanning(false);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-3xl mx-auto py-12 px-4">
        <h2 className="text-2xl font-bold mb-4">QR Token Scanner</h2>
        <div className="space-y-4">
          <div id="html5qr-code-full-region" style={{ width: "100%" }} />
          <div>
            {!scanning ? (
              <button className="btn btn-primary" onClick={startScanner}>Start Scanner</button>
            ) : (
              <button className="btn btn-destructive" onClick={stopScanner}>Stop Scanner</button>
            )}
          </div>
          {message && <div className="text-sm text-muted-foreground">{message}</div>}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
