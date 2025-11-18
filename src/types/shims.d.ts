// src/types/shims.d.ts
declare module "react-qr-code" {
  import * as React from "react";
  const QRCode: React.FC<{ value: string; size?: number; className?: string }>;
  export default QRCode;
}

declare module "@react-google-maps/api" {
  export const useJsApiLoader: any;
  export const GoogleMap: any;
  export const Marker: any;
  export default {};
}

declare module "html5-qrcode" {
  export class Html5Qrcode {
    constructor(elementId: string);
    start(cameraIdOrConfig: any, config: any, qrCodeSuccessCallback: (decodedText: string) => void, qrCodeErrorCallback?: (err: any) => void): Promise<void>;
    stop(): Promise<void>;
    clear(): Promise<void>;
  }
  export default Html5Qrcode;
}
