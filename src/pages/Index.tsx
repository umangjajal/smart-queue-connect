import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import UserTypeSelector from "@/components/UserTypeSelector";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/browse");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <Features />
      <UserTypeSelector />
    </div>
  );
};

export default Index;
