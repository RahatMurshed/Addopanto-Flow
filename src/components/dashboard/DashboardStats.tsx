import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface Metric {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
}

interface DashboardStatsProps {
  metrics: Metric[];
  periodPill: string;
}

export default function DashboardStats({ metrics, periodPill }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {metrics.map((m) => (
        <Card key={m.label} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{m.label}</CardTitle>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                {periodPill}
              </Badge>
            </div>
            <m.icon className={cn("h-4 w-4", m.color)} />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{m.value}</p>
          </CardContent>
          <div className={cn("absolute bottom-0 left-0 h-1 w-full", m.color.replace("text-", "bg-"))} />
        </Card>
      ))}
    </div>
  );
}
