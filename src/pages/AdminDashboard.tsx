import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Store, Users, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Shop = {
  id: string;
  name: string;
  address: string;
  category: string;
  is_active: boolean;
  owner_id: string;
};

type Token = {
  id: string;
  token_number: string;
  status: string;
  created_at: string;
  shop_id: string;
};

type Stats = {
  totalShops: number;
  activeShops: number;
  totalCustomers: number;
  totalTokens: number;
  completedTokens: number;
  pendingTokens: number;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<Shop[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Access Denied",
          description: "Please log in to continue",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const { data: rolesData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin");

      if (error || !rolesData || rolesData.length === 0) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive",
        });
        navigate("/browse");
        return;
      }

      setIsAdmin(true);
      await loadDashboardData();
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/auth");
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch shops
      const { data: shopsData } = await supabase
        .from("shops")
        .select("*")
        .order("created_at", { ascending: false });

      // Fetch tokens
      const { data: tokensData } = await supabase
        .from("tokens")
        .select("*");

      // Fetch customer count
      const { data: customersData } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "customer");

      const totalShops = shopsData?.length || 0;
      const activeShops = shopsData?.filter((s) => s.is_active).length || 0;
      const totalTokens = tokensData?.length || 0;
      const completedTokens = tokensData?.filter((t) => t.status === "served").length || 0;
      const pendingTokens = tokensData?.filter((t) => t.status === "pending").length || 0;

      setShops(shopsData || []);
      setStats({
        totalShops,
        activeShops,
        totalCustomers: customersData?.length || 0,
        totalTokens,
        completedTokens,
        pendingTokens,
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleShopStatus = async (shopId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("shops")
        .update({ is_active: !currentStatus })
        .eq("id", shopId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Shop ${!currentStatus ? "activated" : "deactivated"} successfully`,
      });

      await loadDashboardData();
    } catch (error) {
      console.error("Error toggling shop status:", error);
      toast({
        title: "Error",
        description: "Failed to update shop status",
        variant: "destructive",
      });
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage shops and monitor system activity</p>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Shops</CardTitle>
                <Store className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalShops}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.activeShops} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                <p className="text-xs text-muted-foreground">Registered users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTokens}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.completedTokens} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Tokens</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingTokens}</div>
                <p className="text-xs text-muted-foreground">In queue</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Shops Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shops.map((shop) => (
                  <TableRow key={shop.id}>
                    <TableCell className="font-medium">{shop.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{shop.category}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {shop.address}
                    </TableCell>
                    <TableCell>
                      <Badge variant={shop.is_active ? "default" : "secondary"}>
                        {shop.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleShopStatus(shop.id, shop.is_active)}
                      >
                        {shop.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
