import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Landmark, HandCoins, CreditCard } from "lucide-react";

interface ObligationsData {
  totalInvested: number;
  activeInvestors: number;
  totalLoanOriginal: number;
  totalLoanOutstanding: number;
  activeLoans: number;
}

interface DashboardObligationsProps {
  data: ObligationsData;
  formatCurrency: (v: number) => string;
}

export default function DashboardObligations({ data, formatCurrency }: DashboardObligationsProps) {
  if (data.totalInvested === 0 && data.totalLoanOutstanding === 0) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Landmark className="h-4 w-4 text-primary" />
          Financial Obligations
          <Badge variant="outline" className="ml-auto text-xs font-normal">Cipher Only</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {data.totalInvested > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-card p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
                <HandCoins className="h-4 w-4 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Total Investments</p>
                <p className="text-lg font-bold">{formatCurrency(data.totalInvested)}</p>
                <p className="text-xs text-muted-foreground">{data.activeInvestors} active investor{data.activeInvestors !== 1 ? "s" : ""}</p>
              </div>
            </div>
          )}
          {data.totalLoanOutstanding > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-card p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
                <CreditCard className="h-4 w-4 text-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Outstanding Loans</p>
                <p className="text-lg font-bold">{formatCurrency(data.totalLoanOutstanding)}</p>
                <p className="text-xs text-muted-foreground">
                  {data.activeLoans} active loan{data.activeLoans !== 1 ? "s" : ""} · Originally {formatCurrency(data.totalLoanOriginal)}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
