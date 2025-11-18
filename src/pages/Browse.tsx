import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Clock, Star, Search, LogOut } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Shop {
  id: string;
  name: string;
  description: string;
  category: string;
  location_lat: number;
  location_lng: number;
  address: string;
  image_url: string | null;
  rating: number;
  average_service_time: number;
}

function BrowseContent() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const categories = ["All", "Grocery", "Pharmacy", "Electronics", "Apparel", "Food"];

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Location Error",
            description: "Unable to get your location.",
            variant: "destructive",
          });
        }
      );
    }
  }, [toast]);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("is_active", true)
        .order("rating", { ascending: false });

      if (error) throw error;
      setShops(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load shops",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (shopLat: number, shopLng: number) => {
    if (!userLocation) return null;

    const R = 6371e3;
    const φ1 = (userLocation.lat * Math.PI) / 180;
    const φ2 = (shopLat * Math.PI) / 180;
    const Δφ = ((shopLat - userLocation.lat) * Math.PI) / 180;
    const Δλ = ((shopLng - userLocation.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  };

  const handleGenerateToken = async (shop: Shop) => {
    if (!userLocation) {
      toast({
        title: "Location Required",
        description: "Please enable location access to generate a token.",
        variant: "destructive",
      });
      return;
    }

    const distance = calculateDistance(shop.location_lat, shop.location_lng);
    if (distance === null) return;

    try {
      const { data, error } = await supabase.functions.invoke("generate-token", {
        body: {
          shop_id: shop.id,
          customer_location: {
            lat: userLocation.lat,
            lng: userLocation.lng,
          },
          distance_meters: distance,
        },
      });

      if (error) throw error;

      toast({
        title: "Token Generated!",
        description: `Token: ${data.token_number}. Pickup: ${new Date(
          data.estimated_pickup_time
        ).toLocaleTimeString()}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate token",
        variant: "destructive",
      });
    }
  };

  const filteredShops = shops.filter((shop) => {
    const matchesSearch =
      shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      !selectedCategory || selectedCategory === "All" || shop.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Browse Shops
          </h1>
          <Button onClick={signOut} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            placeholder="Search for shops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category || (!selectedCategory && category === "All") ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setSelectedCategory(category === "All" ? null : category)}
            >
              {category}
            </Badge>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">Loading shops...</div>
        ) : filteredShops.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No shops found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShops.map((shop) => {
              const distance = calculateDistance(shop.location_lat, shop.location_lng);
              return (
                <Card key={shop.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-1">{shop.name}</h3>
                        <Badge variant="secondary">{shop.category}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-primary text-primary" />
                        <span className="font-medium">{shop.rating.toFixed(1)}</span>
                      </div>
                    </div>

                    <p className="text-muted-foreground text-sm mb-4">{shop.description}</p>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{distance ? `${(distance / 1000).toFixed(1)} km` : "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{shop.average_service_time} min</span>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => handleGenerateToken(shop)}
                    >
                      Generate Token
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Browse() {
  return (
    <ProtectedRoute>
      <BrowseContent />
    </ProtectedRoute>
  );
}
