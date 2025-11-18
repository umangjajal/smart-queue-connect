import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Store, ShoppingBag } from "lucide-react";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-soft group-hover:shadow-glow transition-all">
              <Store className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              TokenShop
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/browse" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Browse Shops
            </Link>
            <Link to="/how-it-works" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              How It Works
            </Link>
            <Link to="/shopkeeper" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              For Business
            </Link>
          </nav>
          
          <div className="flex items-center gap-3">
            <Link to="/browse">
              <Button variant="ghost" size="sm">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Shop Now
              </Button>
            </Link>
            <Link to="/shopkeeper">
              <Button size="sm" className="shadow-soft hover:shadow-medium transition-all">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;