import React from "react";
import QRCode from "react-qr-code";

type Props = {
  value: string;
  size?: number;
};

const QRCodeGenerator: React.FC<Props> = ({ value, size = 128 }) => {
  return (
    <div style={{ height: size, width: size, padding: 8, background: "white" }}>
      <QRCode value={value} size={size - 16} />
    </div>
  );
};

export default QRCodeGenerator;
