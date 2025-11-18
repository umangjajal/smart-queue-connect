import React from "react";
import Header from "@/components/Header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, Package, QrCode, BarChart3, Clock, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Benefit = {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
};

const benefits: Benefit[] = [
  {
    icon: Store,
    title: "Digital Shop Management",
    description: "Create your online shop profile and showcase products digitally",
  },
  {
    icon: Package,
    title: "Product Catalog",
    description: "Upload products with images, prices, and detailed descriptions",
  },
  {
    icon: Clock,
    title: "Smart Queue System",
    description: "Automated time slot allocation prevents overcrowding",
  },
  {
    icon: QrCode,
    title: "QR Verification",
    description: "Scan customer tokens for quick and secure order handover",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track sales, popular products, and customer insights",
  },
  {
    icon: Users,
    title: "Customer Management",
    description: "Build relationships with repeat customers and reviews",
  },
];

const Shopkeeper: React.FC = () => {
  const navigate = useNavigate();

  const onStartTrial = () => {
    // direct to onboarding / dashboard — change route to match your app's flow
    navigate("/shopkeeper/dashboard");
  };

  const onWatchDemo = () => {
    // in-app demo modal or external video — replace with actual action
    window.open("https://example.com/demo", "_blank", "noopener,noreferrer");
  };

  const onCreateShop = () => {
    navigate("/shopkeeper/create"); // change to your actual create shop route if different
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-16">
          <section className="text-center max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-top">
            <div className="inline-block">
              <Badge className="bg-gradient-primary border-0 text-lg px-4 py-2">
                For Business Owners
              </Badge>
            </div>

            <h1 className="text-5xl font-bold leading-tight">
              Transform Your Shop Into a
              <br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Smart Digital Business
              </span>
            </h1>

            <p className="text-xl text-muted-foreground">
              Join hundreds of shopkeepers who eliminated queues and increased sales with our platform
            </p>

            <div className="flex gap-4 justify-center pt-4">
              <Button
                size="lg"
                className="shadow-medium hover:shadow-elevated transition-all"
                onClick={onStartTrial}
                aria-label="Start free trial"
              >
                Start Free Trial
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="shadow-soft hover:shadow-medium transition-all"
                onClick={onWatchDemo}
                aria-label="Watch demo"
              >
                Watch Demo
              </Button>
            </div>
          </section>

          <section aria-label="Benefits" className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card
                  key={benefit.title}
                  className="group hover:shadow-elevated transition-all duration-300 border-border hover:border-accent/30 animate-in fade-in slide-in-from-bottom"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-6 space-y-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-7 h-7 text-white" aria-hidden />
                    </div>

                    <h3 className="text-xl font-semibold">{benefit.title}</h3>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <section>
            <Card className="border-2 border-primary/20 shadow-glow animate-in fade-in slide-in-from-bottom">
              <CardHeader>
                <CardTitle className="text-2xl">How It Works for Shopkeepers</CardTitle>
                <CardDescription>Get started in just 4 simple steps</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="grid md:grid-cols-4 gap-6">
                  <Step number={1} title="Register Shop">
                    Create your account and verify your business details
                  </Step>

                  <Step number={2} title="Upload Products">
                    Add your product catalog with images and prices
                  </Step>

                  <Step number={3} title="Receive Orders">
                    Get notifications when customers place orders
                  </Step>

                  <Step number={4} title="Scan & Deliver">
                    Verify QR code and hand over pre-packed orders
                  </Step>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="bg-gradient-hero rounded-2xl p-12 text-center space-y-6 shadow-elevated animate-in fade-in slide-in-from-bottom">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Ready to Modernize Your Business?
            </h2>

            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Join our platform today and start accepting digital orders with smart token management
            </p>

            <div className="flex justify-center gap-4">
              <Button
                size="lg"
                variant="secondary"
                className="shadow-medium hover:shadow-elevated transition-all"
                onClick={onCreateShop}
                aria-label="Create your shop now"
              >
                Create Your Shop Now
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-white/90"
                onClick={() => navigateToDocs()}
                aria-label="Learn more"
              >
                Learn More
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

function navigateToDocs() {
  // Replace with your docs or help center
  window.open("https://example.com/docs", "_blank", "noopener,noreferrer");
}

const Step: React.FC<{ number: number; title: string; children?: React.ReactNode }> = ({
  number,
  title,
  children,
}) => {
  return (
    <div className="space-y-3">
      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
        {number}
      </div>

      <h4 className="font-semibold">{title}</h4>

      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
};

const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${className ?? ""}`} role="status" aria-label="badge">
      {children}
    </span>
  );
};

export default Shopkeeper;
