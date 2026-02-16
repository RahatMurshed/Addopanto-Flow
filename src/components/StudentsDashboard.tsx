import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, subDays, startOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, GraduationCap, UserMinus, CalendarPlus,
  Plus, Upload, Download, Filter,
  TrendingUp, TrendingDown, BarChart3,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from "recharts";
import type { Student } from "@/hooks/useStudents";
import type { Batch } from "@/hooks/useBatches";
import type { defaultFilters, StudentFilterValues } from "@/components/StudentFilters";

interface StudentsDashboardProps {
  allStudents: Student[];
  batches: Batch[];
  onSetFilters: (filters: Partial<StudentFilterValues>) => void;
  onImport: () => void;
  onExport: () => void;
  canAdd: boolean;
  hasStudents: boolean;
}

const CHART_COLORS = [
  "hsl(30, 100%, 35%)",   // primary orange
  "hsl(217, 70%, 25%)",   // secondary blue
  "hsl(142, 76%, 30%)",   // success green
  "hsl(38, 92%, 32%)",    // warning
  "hsl(0, 84%, 45%)",     // destructive
  "hsl(280, 60%, 45%)",   // purple
  "hsl(190, 80%, 35%)",   // teal
  "hsl(340, 70%, 45%)",   // pink
];

export default function StudentsDashboard({
  allStudents,
  batches,
  onSetFilters,
  onImport,
  onExport,
  canAdd,
  hasStudents,
}: StudentsDashboardProps) {
  const navigate = useNavigate();

  const totalStudents = allStudents.length;
  const enrolledStudents = allStudents.filter((s) => s.batch_id != null);
  const unenrolledStudents = allStudents.filter((s) => s.batch_id == null);
  const enrolledCount = enrolledStudents.length;
  const unenrolledCount = unenrolledStudents.length;
  const enrolledPct = totalStudents > 0 ? Math.round((enrolledCount / totalStudents) * 100) : 0;
  const unenrolledPct = totalStudents > 0 ? Math.round((unenrolledCount / totalStudents) * 100) : 0;

  const thisMonthStart = startOfMonth(new Date());
  const addedThisMonth = allStudents.filter(
    (s) => new Date(s.created_at) >= thisMonthStart
  ).length;

  const lastWeek = subDays(new Date(), 7);
  const recentlyAdded = allStudents.filter(
    (s) => new Date(s.created_at) >= lastWeek
  ).length;

  const activeBatches = batches.filter((b) => b.status === "active").length;

  // Gender distribution
  const genderData = useMemo(() => {
    const counts: Record<string, number> = {};
    allStudents.forEach((s) => {
      const g = s.gender || "Not Specified";
      counts[g] = (counts[g] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [allStudents]);

  // Class/Grade breakdown
  const classData = useMemo(() => {
    const counts: Record<string, number> = {};
    allStudents.forEach((s) => {
      const c = s.class_grade || "Not Specified";
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [allStudents]);

  // Enrollment trend (last 6 months)
  const trendData = useMemo(() => {
    const months: { month: string; enrolled: number; unenrolled: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = format(d, "MMM yyyy");
      const monthStart = startOfMonth(d);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const studentsAtMonth = allStudents.filter(
        (s) => new Date(s.created_at) < monthEnd
      );
      const enrolled = studentsAtMonth.filter((s) => s.batch_id != null).length;
      const unenrolled = studentsAtMonth.filter((s) => s.batch_id == null).length;
      months.push({ month: format(d, "MMM"), enrolled, unenrolled });
    }
    return months;
  }, [allStudents]);

  // Enrollment pie
  const enrollmentPieData = [
    { name: "Enrolled", value: enrolledCount },
    { name: "Not Enrolled", value: unenrolledCount },
  ];

  return (
    <div className="space-y-6">
      {/* Primary Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onSetFilters({ status: "all" })}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalStudents}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow border-green-500/20" onClick={() => onSetFilters({ status: "active" })}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Enrolled</CardTitle>
            <div className="rounded-lg bg-green-500/10 p-2">
              <GraduationCap className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{enrolledCount}</p>
            <p className="text-xs text-muted-foreground mt-1">{enrolledPct}% of total</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow border-orange-500/20" onClick={() => onSetFilters({ batchId: "none" })}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unenrolled</CardTitle>
            <div className="rounded-lg bg-orange-500/10 p-2">
              <UserMinus className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{unenrolledCount}</p>
            <p className="text-xs text-muted-foreground mt-1">{unenrolledPct}% of total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Added This Month</CardTitle>
            <div className="rounded-lg bg-secondary/10 p-2">
              <CalendarPlus className="h-4 w-4 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{addedThisMonth}</p>
              {addedThisMonth > 0 && <TrendingUp className="h-4 w-4 text-green-600" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Recently Added</p>
                <p className="text-lg font-bold mt-0.5">{recentlyAdded}</p>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </div>
              <CalendarPlus className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Active Batches</p>
                <p className="text-lg font-bold mt-0.5">{activeBatches}</p>
                <p className="text-xs text-muted-foreground">Currently running</p>
              </div>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        {/* Gender mini-chart */}
        <Card className="col-span-2">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground font-medium mb-2">Gender Distribution</p>
            <div className="flex items-center gap-4">
              {genderData.length > 0 ? (
                <>
                  <div className="h-16 w-16 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={genderData} dataKey="value" cx="50%" cy="50%" outerRadius={28} innerRadius={14} strokeWidth={1}>
                          {genderData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {genderData.map((g, i) => (
                      <div key={g.name} className="flex items-center gap-1.5 text-xs">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-muted-foreground">{g.name}</span>
                        <span className="font-medium">{g.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {canAdd && (
          <>
            <Button onClick={() => navigate("/students/new")} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Add New Student
            </Button>
            <Button variant="outline" onClick={onImport}>
              <Upload className="mr-2 h-4 w-4" /> Import Students
            </Button>
          </>
        )}
        {hasStudents && (
          <>
            <Button variant="outline" onClick={onExport}>
              <Download className="mr-2 h-4 w-4" /> Export All Students
            </Button>
            <Button variant="outline" onClick={() => onSetFilters({ status: "active" })}>
              <Filter className="mr-2 h-4 w-4" /> View Enrolled
            </Button>
          </>
        )}
      </div>

      {/* Charts Row */}
      {hasStudents && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Enrollment Trend */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Enrollment Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        color: "hsl(var(--popover-foreground))",
                      }}
                    />
                    <Line type="monotone" dataKey="enrolled" stroke="hsl(142, 76%, 30%)" strokeWidth={2} dot={{ r: 3 }} name="Enrolled" />
                    <Line type="monotone" dataKey="unenrolled" stroke="hsl(30, 100%, 35%)" strokeWidth={2} dot={{ r: 3 }} name="Unenrolled" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Class Distribution */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Class/Grade Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                {classData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={classData} layout="vertical" margin={{ left: 0, right: 16 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                          color: "hsl(var(--popover-foreground))",
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(217, 70%, 25%)" radius={[0, 4, 4, 0]} name="Students" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No class data</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Enrollment Status Pie */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Enrollment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={enrollmentPieData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      innerRadius={35}
                      strokeWidth={2}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      <Cell fill="hsl(142, 76%, 30%)" />
                      <Cell fill="hsl(30, 100%, 35%)" />
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        color: "hsl(var(--popover-foreground))",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
