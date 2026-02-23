import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subMonths, format, startOfMonth, endOfMonth, eachMonthOfInterval, getDaysInMonth, getDay } from "date-fns";

export interface MonthlyPerformance {
  month: string; // yyyy-MM
  label: string; // "Jan 2025"
  daysPresent: number;
  daysAbsent: number;
  halfDays: number;
  leaveDays: number;
  workingDays: number;
  attendancePercent: number;
  salaryPaid: boolean;
  salaryAmount: number;
}

export interface PerformanceData {
  months: MonthlyPerformance[];
  overallScore: number;
  avgAttendance: number;
  totalPresent: number;
  totalLeaves: number;
  monthsPaidOnTime: number;
  totalMonths: number;
  isLoading: boolean;
}

function getWorkingDays(year: number, month: number): number {
  const totalDays = getDaysInMonth(new Date(year, month));
  let working = 0;
  for (let d = 1; d <= totalDays; d++) {
    const day = getDay(new Date(year, month, d));
    if (day !== 0) working++; // exclude Sundays
  }
  return working;
}

export function useEmployeePerformance(
  employeeId: string | undefined,
  monthsBack: number = 6,
  salaryVisible: boolean = false
): PerformanceData {
  const now = new Date();
  const startDate = startOfMonth(subMonths(now, monthsBack - 1));
  const endDate = endOfMonth(now);

  const monthRange = useMemo(() => {
    return eachMonthOfInterval({ start: startDate, end: endDate }).map(d => ({
      key: format(d, "yyyy-MM"),
      label: format(d, "MMM yyyy"),
      year: d.getFullYear(),
      monthIndex: d.getMonth(),
    }));
  }, [monthsBack]);

  const { data: attendance = [], isLoading: attLoading } = useQuery({
    queryKey: ["employee-perf-attendance", employeeId, monthsBack],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from("employee_attendance")
        .select("date, status")
        .eq("employee_id", employeeId)
        .gte("date", format(startDate, "yyyy-MM-dd"))
        .lte("date", format(endDate, "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeId,
  });

  const { data: salaryPayments = [], isLoading: salLoading } = useQuery({
    queryKey: ["employee-perf-salary", employeeId, monthsBack],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from("employee_salary_payments")
        .select("month, net_amount")
        .eq("employee_id", employeeId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeId,
  });

  const months = useMemo<MonthlyPerformance[]>(() => {
    const attByMonth: Record<string, typeof attendance> = {};
    attendance.forEach(a => {
      const m = a.date.substring(0, 7);
      if (!attByMonth[m]) attByMonth[m] = [];
      attByMonth[m].push(a);
    });

    const salByMonth: Record<string, number> = {};
    salaryPayments.forEach(s => {
      salByMonth[s.month] = (salByMonth[s.month] || 0) + s.net_amount;
    });

    return monthRange.map(({ key, label, year, monthIndex }) => {
      const records = attByMonth[key] || [];
      const daysPresent = records.filter(r => r.status === "present").length;
      const daysAbsent = records.filter(r => r.status === "absent").length;
      const halfDays = records.filter(r => r.status === "half_day").length;
      const leaveDays = records.filter(r => r.status === "leave").length;
      const workingDays = getWorkingDays(year, monthIndex);
      const effectiveDays = daysPresent + halfDays * 0.5;
      const attendancePercent = workingDays > 0 ? Math.round((effectiveDays / workingDays) * 100) : 0;
      const salaryAmount = salByMonth[key] || 0;

      return {
        month: key,
        label,
        daysPresent,
        daysAbsent,
        halfDays,
        leaveDays,
        workingDays,
        attendancePercent: Math.min(attendancePercent, 100),
        salaryPaid: salaryAmount > 0,
        salaryAmount,
      };
    });
  }, [attendance, salaryPayments, monthRange]);

  const stats = useMemo(() => {
    const totalMonths = months.length;
    const avgAttendance = totalMonths > 0
      ? Math.round(months.reduce((s, m) => s + m.attendancePercent, 0) / totalMonths)
      : 0;
    const totalPresent = months.reduce((s, m) => s + m.daysPresent, 0);
    const totalLeaves = months.reduce((s, m) => s + m.leaveDays, 0);
    const monthsPaidOnTime = months.filter(m => m.salaryPaid).length;

    const attendanceScore = avgAttendance;
    const salaryScore = totalMonths > 0 ? Math.round((monthsPaidOnTime / totalMonths) * 100) : 0;
    const overallScore = salaryVisible
      ? Math.round(attendanceScore * 0.7 + salaryScore * 0.3)
      : attendanceScore;

    return { overallScore, avgAttendance, totalPresent, totalLeaves, monthsPaidOnTime, totalMonths };
  }, [months, salaryVisible]);

  return {
    months,
    ...stats,
    isLoading: attLoading || salLoading,
  };
}
