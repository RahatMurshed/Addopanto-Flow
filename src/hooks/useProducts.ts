import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface Product {
  id: string;
  company_id: string;
  product_name: string;
  product_code: string;
  category: string;
  type: string;
  description: string | null;
  price: number;
  purchase_price: number;
  stock_quantity: number;
  reorder_level: number;
  image_url: string | null;
  status: string;
  linked_course_id: string | null;
  supplier_id: string | null;
  barcode: string | null;
  sku: string | null;
  user_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProductInsert {
  product_name: string;
  product_code: string;
  category?: string;
  type?: string;
  description?: string | null;
  price: number;
  purchase_price?: number;
  stock_quantity?: number;
  reorder_level?: number;
  image_url?: string | null;
  status?: string;
  linked_course_id?: string | null;
  supplier_id?: string | null;
  barcode?: string | null;
  sku?: string | null;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  status?: string;
}

export function useProducts(filters?: ProductFilters) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const search = filters?.search?.trim() || "";
  const category = filters?.category || "all";
  const status = filters?.status || "all";

  return useQuery({
    queryKey: ["products", activeCompanyId, { search, category, status }],
    queryFn: async () => {
      if (!user || !activeCompanyId) return [];
      let query = supabase
        .from("products" as any)
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false });

      if (category !== "all") query = query.eq("category", category);
      if (status !== "all") query = query.eq("status", status);
      if (search) {
        const s = search.replace(/[%_\\]/g, "\\$&");
        query = query.or(`product_name.ilike.%${s}%,product_code.ilike.%${s}%,barcode.ilike.%${s}%,sku.ilike.%${s}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
    enabled: !!user && !!activeCompanyId,
  });
}

export function useProduct(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["products", id],
    queryFn: async () => {
      if (!user || !id) return null;
      const { data, error } = await supabase
        .from("products" as any)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as Product;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateProduct() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: ProductInsert) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase
        .from("products" as any)
        .insert({
          ...product,
          company_id: activeCompanyId,
          user_id: user.id,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("products" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Product update failed — you may not have permission.");
      return data as unknown as Product;
    },
    onSuccess: (data: Product) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", data.id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
