import { Clock, QrCode, ShoppingBag, Bell, MapPin, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Clock,
    title: "Time Slot Booking",
    description: "Reserve your pickup time in advance and avoid waiting in queues."
  },
  {
    icon: QrCode,
    title: "QR Code Verification",
    description: "Secure token system with QR codes for quick and contactless pickup."
  },
  {
    icon: ShoppingBag,
    title: "Pre-Packaged Orders",
    description: "Your order is ready before you arrive, ensuring instant pickup."
  },
  {
    icon: Bell,
    title: "Real-Time Updates",
    description: "Get instant notifications about your order status and pickup time."
  },
  {
    icon: MapPin,
    title: "Location Based",
    description: "Find nearby shops and get optimized pickup times based on location."
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    description: "Safe digital payments and verified shopkeeper authentication."
  }
];

const Features = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl font-bold">
            Why Choose <span className="bg-gradient-primary bg-clip-text text-transparent">TokenShop</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Experience the future of retail with our smart token-based service platform
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="group hover:shadow-elevated transition-all duration-300 border-border hover:border-primary/30 animate-in fade-in slide-in-from-bottom"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6 space-y-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;