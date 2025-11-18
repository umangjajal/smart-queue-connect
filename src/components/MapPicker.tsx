import React, { useCallback } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

type Props = {
  value?: { lat?: number | null; lng?: number | null };
  onChange?: (lat: number, lng: number) => void;
  readOnly?: boolean;
};

const containerStyle = {
  width: "100%",
  height: "100%",
};

const MapPicker: React.FC<Props> = ({ value, onChange, readOnly }) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey || "",
  });

  const center = {
    lat: value?.lat ?? 20.5937,
    lng: value?.lng ?? 78.9629,
  };

  const handleClick = useCallback(
    (e: any) => {
      if (readOnly) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      onChange && onChange(lat, lng);
    },
    [onChange, readOnly]
  );

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={13}
      onClick={handleClick}
    >
      {value?.lat && value?.lng && (
        <Marker position={{ lat: value.lat as number, lng: value.lng as number }} />
      )}
    </GoogleMap>
  );
};

export default MapPicker;
