import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface ProductSale {
  id: string;
  company_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  customer_name: string | null;
  student_id: string | null;
  payment_method: string;
  payment_status: string;
  sale_date: string;
  notes: string | null;
  source_id: string | null;
  user_id: string;
  created_at: string;
}

export interface ProductSaleInsert {
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  customer_name?: string | null;
  student_id?: string | null;
  payment_method?: string;
  payment_status?: string;
  sale_date?: string;
  notes?: string | null;
  source_id?: string | null;
}

export function useProductSales(productId?: string) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  return useQuery({
    queryKey: ["product-sales", activeCompanyId, productId],
    queryFn: async () => {
      if (!user || !activeCompanyId) return [];
      let query = supabase
        .from("product_sales" as any)
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("sale_date", { ascending: false });

      if (productId) query = query.eq("product_id", productId);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ProductSale[];
    },
    enabled: !!user && !!activeCompanyId,
  });
}

export function useCreateProductSale() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sale: ProductSaleInsert) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase
        .from("product_sales" as any)
        .insert({
          ...sale,
          company_id: activeCompanyId,
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ProductSale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["product-stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-totals"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["account_balances"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["revenue_summary_rpc"] });
      queryClient.invalidateQueries({ queryKey: ["revenue_summary"] });
    },
  });
}

export function useDeleteProductSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_sales" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["product-stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-totals"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["account_balances"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["revenue_summary_rpc"] });
      queryClient.invalidateQueries({ queryKey: ["revenue_summary"] });
    },
  });
}
