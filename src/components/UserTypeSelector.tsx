import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Store } from "lucide-react";
import { Link } from "react-router-dom";
import customerImage from "@/assets/customer-experience.jpg";
import shopkeeperImage from "@/assets/shopkeeper-dashboard.jpg";

const UserTypeSelector = () => {
  return (
    <section className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl font-bold">Choose Your Experience</h2>
          <p className="text-xl text-muted-foreground">
            Whether you're shopping or selling, we've got you covered
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <Card className="group hover:shadow-glow transition-all duration-500 border-2 hover:border-primary/50 animate-in fade-in slide-in-from-left">
            <CardHeader className="space-y-4">
              <div className="relative h-48 rounded-lg overflow-hidden">
                <img 
                  src={customerImage} 
                  alt="Customer Experience" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-primary opacity-20" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">I'm a Customer</CardTitle>
              </div>
              <CardDescription className="text-base">
                Browse shops, order products, and pick them up without waiting in queues
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Browse unlimited shops and products
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Get smart token with pickup time
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Real-time order tracking
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Contactless QR code pickup
                </li>
              </ul>
          <Button className="w-full" size="lg" asChild>
            <Link to="/auth">Get Started as Customer</Link>
          </Button>
            </CardContent>
          </Card>
          
          <Card className="group hover:shadow-glow transition-all duration-500 border-2 hover:border-accent/50 animate-in fade-in slide-in-from-right">
            <CardHeader className="space-y-4">
              <div className="relative h-48 rounded-lg overflow-hidden">
                <img 
                  src={shopkeeperImage} 
                  alt="Shopkeeper Dashboard" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-primary opacity-20" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Store className="w-6 h-6 text-accent" />
                </div>
                <CardTitle className="text-2xl">I'm a Shopkeeper</CardTitle>
              </div>
              <CardDescription className="text-base">
                Manage your shop, products, and orders with our digital platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Digital product catalog management
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Automated queue & time management
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  QR code verification system
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Sales analytics & insights
                </li>
              </ul>
              <Link to="/shopkeeper" className="block">
                <Button variant="outline" className="w-full shadow-soft hover:shadow-medium transition-all border-accent hover:bg-accent/5">
                  Setup Your Shop
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default UserTypeSelector;