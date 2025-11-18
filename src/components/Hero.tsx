import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, QrCode, Store } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-token-system.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-subtle">
      <div className="absolute inset-0 bg-gradient-hero opacity-10" />
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left duration-700">
            <div className="inline-block">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Clock className="w-4 h-4" />
                Smart Queue Management
              </span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
              Skip The Wait,
              <br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Shop Smart
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-lg">
              Revolutionary token-based service platform that eliminates queues. Order ahead, 
              get your time slot, and pick up without waiting.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Link to="/browse">
                <Button size="lg" className="group shadow-medium hover:shadow-elevated transition-all">
                  Browse Shops
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/shopkeeper">
                <Button size="lg" variant="outline" className="shadow-soft hover:shadow-medium transition-all">
                  <Store className="mr-2 w-4 h-4" />
                  For Shopkeepers
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center gap-8 pt-4">
              <div className="space-y-1">
                <div className="text-3xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground">Active Shops</div>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="space-y-1">
                <div className="text-3xl font-bold text-primary">10K+</div>
                <div className="text-sm text-muted-foreground">Happy Customers</div>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="space-y-1">
                <div className="text-3xl font-bold text-primary">99%</div>
                <div className="text-sm text-muted-foreground">On-Time Pickup</div>
              </div>
            </div>
          </div>
          
          <div className="relative animate-in fade-in slide-in-from-right duration-700 delay-300">
            <div className="relative rounded-2xl overflow-hidden shadow-elevated hover:shadow-glow transition-all duration-500">
              <img 
                src={heroImage} 
                alt="Smart Token System Interface" 
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-primary opacity-20" />
            </div>
            
            <div className="absolute -bottom-6 -left-6 bg-card rounded-xl shadow-elevated p-4 border border-border animate-in fade-in slide-in-from-bottom duration-700 delay-500">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="font-semibold">Token #A247</div>
                  <div className="text-sm text-muted-foreground">Ready in 5 mins</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;