import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface ProductCategory {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  is_system: boolean;
  sort_order: number;
  user_id: string;
  created_at: string;
}

export interface ProductCategoryInsert {
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  sort_order?: number;
}

export function useProductCategories() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  return useQuery({
    queryKey: ["product_categories", activeCompanyId],
    queryFn: async () => {
      if (!user || !activeCompanyId) return [];
      const { data, error } = await supabase
        .from("product_categories" as any)
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ProductCategory[];
    },
    enabled: !!user && !!activeCompanyId,
  });
}

export function useCreateProductCategory() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: ProductCategoryInsert) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase
        .from("product_categories" as any)
        .insert({
          ...category,
          company_id: activeCompanyId,
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ProductCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_categories"] });
    },
  });
}

export function useUpdateProductCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductCategoryInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("product_categories" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ProductCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_categories"] });
    },
  });
}

export function useDeleteProductCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_categories" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_categories"] });
    },
  });
}
