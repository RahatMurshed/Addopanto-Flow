import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface PurchaseOrder {
  id: string;
  company_id: string;
  supplier_id: string | null;
  order_number: string;
  status: string;
  expected_delivery: string | null;
  total_amount: number;
  notes: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderInsert {
  supplier_id?: string | null;
  order_number: string;
  status?: string;
  expected_delivery?: string | null;
  total_amount?: number;
  notes?: string | null;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  company_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
  user_id: string;
  created_at: string;
}

export interface PurchaseOrderItemInsert {
  purchase_order_id: string;
  product_id: string;
  quantity_ordered: number;
  unit_cost: number;
  total_cost: number;
}

export function usePurchaseOrders() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  return useQuery({
    queryKey: ["purchase_orders", activeCompanyId],
    queryFn: async () => {
      if (!user || !activeCompanyId) return [];
      const { data, error } = await supabase
        .from("purchase_orders" as any)
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PurchaseOrder[];
    },
    enabled: !!user && !!activeCompanyId,
  });
}

export function usePurchaseOrder(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["purchase_orders", id],
    queryFn: async () => {
      if (!user || !id) return null;
      const { data, error } = await supabase
        .from("purchase_orders" as any)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as PurchaseOrder;
    },
    enabled: !!user && !!id,
  });
}

export function usePurchaseOrderItems(orderId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["purchase_order_items", orderId],
    queryFn: async () => {
      if (!user || !orderId) return [];
      const { data, error } = await supabase
        .from("purchase_order_items" as any)
        .select("*")
        .eq("purchase_order_id", orderId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PurchaseOrderItem[];
    },
    enabled: !!user && !!orderId,
  });
}

export function useCreatePurchaseOrder() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: PurchaseOrderInsert) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase
        .from("purchase_orders" as any)
        .insert({ ...order, company_id: activeCompanyId, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PurchaseOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PurchaseOrderInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("purchase_orders" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PurchaseOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
    },
  });
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("purchase_orders" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
    },
  });
}

export function useCreatePurchaseOrderItem() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: PurchaseOrderItemInsert) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase
        .from("purchase_order_items" as any)
        .insert({ ...item, company_id: activeCompanyId, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PurchaseOrderItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_order_items"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
    },
  });
}

export function useReceivePurchaseOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quantity_received }: { id: string; quantity_received: number }) => {
      const { data, error } = await supabase
        .from("purchase_order_items" as any)
        .update({ quantity_received })
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PurchaseOrderItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_order_items"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
