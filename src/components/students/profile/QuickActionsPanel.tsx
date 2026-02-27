import { useState, useMemo, useCallback } from "react";
import {
  MessageCircle, MessageSquarePlus, CreditCard, Pencil,
  FileDown, Tag, Zap, X, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { cleanPhone } from "./ProfileHeader";

interface QuickActionsPanelProps {
  student: {
    id: string;
    name: string;
    phone?: string | null;
    status: string;
    [key: string]: any;
  };
  companyId: string;
  userRole: string;
  userPermissions: string[];
  onStatusChange?: (newStatus: string) => void;
  onEdit: () => void;
  isLoading?: boolean;
}

// Status options removed — status changes handled elsewhere

type ActionItem = {
  id: string;
  icon: React.ElementType;
  label: string;
  iconColor: string;
  className: string;
  fabColor: string;
  onClick: () => void;
  disabled?: boolean;
  disabledTooltip?: string;
  group: "communication" | "actions" | "admin";
};

export function QuickActionsPanel({
  student, companyId, userRole, userPermissions, onEdit, isLoading,
}: QuickActionsPanelProps) {
  const { toast } = useToast();
  const [saving] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  const isAdminOrCipher = userRole === "cipher" || userRole === "admin";
  const isModerator = userRole === "moderator";

  const handleWhatsApp = useCallback(() => {
    if (!student.phone) return;
    const cleaned = cleanPhone(student.phone).replace("+", "");
    window.open(`https://wa.me/${cleaned}`, "_blank");
  }, [student.phone]);

  const handleScrollToNotes = useCallback(() => {
    const el = document.querySelector('[data-section="sales-notes"]');
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    setFabOpen(false);
  }, []);

  // Status change logic removed

  const actions = useMemo<ActionItem[]>(() => {
    const items: ActionItem[] = [];

    // WhatsApp
    items.push({
      id: "whatsapp",
      icon: MessageCircle,
      label: "Chat on WhatsApp",
      iconColor: "#25D366",
      className: "bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 hover:bg-[#25D366]/20",
      fabColor: "#25D366",
      onClick: handleWhatsApp,
      disabled: !student.phone,
      disabledTooltip: "No phone number on record",
      group: "communication",
    });

    // Add Sales Note
    items.push({
      id: "sales-note",
      icon: MessageSquarePlus,
      label: "Add Sales Note",
      iconColor: "#FF8C00",
      className: "bg-orange-50 text-[#FF8C00] border border-orange-200 hover:bg-orange-100 dark:bg-orange-950/30 dark:border-orange-800 dark:hover:bg-orange-950/50",
      fabColor: "#FF8C00",
      onClick: handleScrollToNotes,
      group: "actions",
    });

    // Record Payment
    if (isAdminOrCipher || (isModerator && userPermissions.includes("manage_payments"))) {
      items.push({
        id: "record-payment",
        icon: CreditCard,
        label: "Record Payment",
        iconColor: "#1E3A8A",
        className: "bg-blue-50 text-[#1E3A8A] border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/30 dark:border-blue-800 dark:hover:bg-blue-950/50",
        fabColor: "#1E3A8A",
        onClick: () => toast({ title: "Payment recording", description: "Use the Financial Breakdown section below to record payments." }),
        group: "actions",
      });
    }

    // Edit Student
    if (isAdminOrCipher || (isModerator && userPermissions.includes("edit_students"))) {
      items.push({
        id: "edit-student",
        icon: Pencil,
        label: "Edit Student",
        iconColor: "#1E3A8A",
        className: "bg-muted/50 text-foreground border border-border hover:bg-muted",
        fabColor: "#1E3A8A",
        onClick: () => { onEdit(); setFabOpen(false); },
        group: "actions",
      });
    }

    // Change Status removed

    // Export PDF
    if (isAdminOrCipher) {
      items.push({
        id: "export-pdf",
        icon: FileDown,
        label: "Export PDF Report",
        iconColor: "#1E3A8A",
        className: "bg-muted/50 text-foreground border border-border hover:bg-muted",
        fabColor: "#64748b",
        onClick: () => toast({ title: "PDF export coming soon" }),
        group: "admin",
      });
    }

    // Manage Tags
    if (isAdminOrCipher) {
      items.push({
        id: "manage-tags",
        icon: Tag,
        label: "Manage Tags",
        iconColor: "#1E3A8A",
        className: "bg-muted/50 text-foreground border border-border hover:bg-muted",
        fabColor: "#64748b",
        onClick: () => toast({ title: "Tag management coming soon" }),
        group: "admin",
      });
    }

    return items;
  }, [student.phone, isAdminOrCipher, isModerator, userPermissions, handleWhatsApp, handleScrollToNotes, onEdit, toast]);

  const groupedActions = useMemo(() => {
    const communication = actions.filter(a => a.group === "communication");
    const actionGroup = actions.filter(a => a.group === "actions");
    const admin = actions.filter(a => a.group === "admin");
    return { communication, actions: actionGroup, admin };
  }, [actions]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border p-5 sticky top-20 z-10">
        <Skeleton className="w-24 h-3 mb-4" />
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="w-full h-10 rounded-lg" />
          ))}
          <div className="border-t border-border my-3" />
          <Skeleton className="w-full h-10 rounded-lg" />
          <Skeleton className="w-full h-10 rounded-lg" />
        </div>
      </div>
    );
  }

  const renderActionButton = (action: ActionItem) => {
    const btn = (
      <Button
        key={action.id}
        variant="ghost"
        className={cn("w-full justify-start rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 h-auto", action.className)}
        disabled={action.disabled || saving}
        onClick={action.onClick}
      >
        <action.icon className="h-4 w-4 mr-3 shrink-0" style={{ color: action.disabled ? undefined : action.iconColor }} />
        {action.label}
      </Button>
    );

    if (action.disabled && action.disabledTooltip) {
      return (
        <Tooltip key={action.id}>
          <TooltipTrigger asChild>{btn}</TooltipTrigger>
          <TooltipContent>{action.disabledTooltip}</TooltipContent>
        </Tooltip>
      );
    }
    return btn;
  };

  return (
    <>
      {/* DESKTOP PANEL */}
      <div className="hidden lg:block bg-card rounded-xl shadow-sm border border-border p-5 sticky top-20 z-10">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Quick Actions</p>

        <div className="flex flex-col gap-2">
          {/* Communication group */}
          {groupedActions.communication.length > 0 && (
            <>
              {groupedActions.communication.map(renderActionButton)}
            </>
          )}

          {/* Actions group */}
          {groupedActions.actions.map(renderActionButton)}


          {/* Admin group */}
          {groupedActions.admin.length > 0 && (
            <>
              <div className="border-t border-border my-3" />
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Admin</p>
              {groupedActions.admin.map(renderActionButton)}
            </>
          )}
        </div>
      </div>

      {/* MOBILE FAB SPEED DIAL */}
      <div className="lg:hidden">
        {/* Backdrop */}
        {fabOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-40 transition-opacity"
            onClick={() => setFabOpen(false)}
          />
        )}

        {/* Speed dial items */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
          {/* FAB items */}
          {fabOpen && actions.filter(a => !a.disabled).map((action, index) => (
            <div
              key={action.id}
              className="flex items-center gap-2 transition-all duration-200"
              style={{
                transitionDelay: `${index * 40}ms`,
                opacity: fabOpen ? 1 : 0,
                transform: fabOpen ? "scale(1)" : "scale(0)",
              }}
            >
              <span className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded shadow-sm whitespace-nowrap">
                {action.label}
              </span>
              <button
                className="w-12 h-12 rounded-full shadow-md flex items-center justify-center text-white transition-transform hover:scale-110"
                style={{ backgroundColor: action.fabColor }}
                onClick={() => { action.onClick(); setFabOpen(false); }}
              >
                <action.icon className="h-5 w-5" />
              </button>
            </div>
          ))}

          {/* Main FAB */}
          <button
            className="w-14 h-14 rounded-full shadow-lg bg-[#FF8C00] text-white flex items-center justify-center transition-transform hover:scale-105"
            onClick={() => setFabOpen(!fabOpen)}
          >
            {fabOpen ? <X className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
          </button>
        </div>
      </div>



    </>
  );
}

export function QuickActionsSkeleton() {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-5">
      <Skeleton className="w-24 h-3 mb-4" />
      <div className="flex flex-col gap-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="w-full h-10 rounded-lg" />
        ))}
        <div className="border-t border-border my-3" />
        <Skeleton className="w-full h-10 rounded-lg" />
        <Skeleton className="w-full h-10 rounded-lg" />
      </div>
    </div>
  );
}
