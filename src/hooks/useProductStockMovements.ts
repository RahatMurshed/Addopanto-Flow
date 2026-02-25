import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface StockMovement {
  id: string;
  company_id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference_id: string | null;
  reason: string | null;
  user_id: string;
  created_at: string;
}

export function useProductStockMovements(productId?: string) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  return useQuery({
    queryKey: ["product-stock-movements", activeCompanyId, productId],
    queryFn: async () => {
      if (!user || !activeCompanyId) return [];
      let query = supabase
        .from("product_stock_movements" as any)
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false });

      if (productId) query = query.eq("product_id", productId);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as StockMovement[];
    },
    enabled: !!user && !!activeCompanyId,
  });
}

export function useCreateStockAdjustment() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, quantity, reason }: { productId: string; quantity: number; reason: string }) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");

      // Get current stock
      const { data: product, error: pErr } = await supabase
        .from("products" as any)
        .select("stock_quantity")
        .eq("id", productId)
        .single();
      if (pErr) throw pErr;

      const prev = (product as any).stock_quantity as number;
      const newStock = prev + quantity;
      if (newStock < 0) throw new Error("Stock cannot go below zero");

      // Update product stock
      const { error: uErr } = await supabase
        .from("products" as any)
        .update({ stock_quantity: newStock })
        .eq("id", productId);
      if (uErr) throw uErr;

      // Insert movement
      const { data, error } = await supabase
        .from("product_stock_movements" as any)
        .insert({
          company_id: activeCompanyId,
          product_id: productId,
          movement_type: quantity > 0 ? "purchase" : "adjustment",
          quantity: Math.abs(quantity),
          previous_stock: prev,
          new_stock: newStock,
          reason,
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as StockMovement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-stock-movements"] });
    },
  });
}
