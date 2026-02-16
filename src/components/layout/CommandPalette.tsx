import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAllStudents } from "@/hooks/useStudents";
import { useBatches } from "@/hooks/useBatches";
import { useCourses } from "@/hooks/useCourses";
import {
  GraduationCap, Layers, BookOpen, LayoutDashboard, TrendingUp,
  Receipt, FileText, Settings, Users, Wallet, ClipboardList, UserCircle,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandPalette({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { data: students = [] } = useAllStudents();
  const { data: batches = [] } = useBatches();
  const { data: courses = [] } = useCourses();

  const go = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  const pages = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Students", icon: GraduationCap, path: "/students" },
    { label: "Courses", icon: BookOpen, path: "/courses" },
    { label: "Revenue", icon: TrendingUp, path: "/revenue" },
    { label: "Expenses", icon: Receipt, path: "/expenses" },
    { label: "Expense Sources", icon: Wallet, path: "/khatas" },
    { label: "Reports", icon: FileText, path: "/reports" },
    { label: "Members", icon: Users, path: "/company/members" },
    { label: "Audit Log", icon: ClipboardList, path: "/audit-log" },
    { label: "Settings", icon: Settings, path: "/settings" },
    { label: "My Profile", icon: UserCircle, path: "/profile" },
  ];

  // Limit search results for performance
  const topStudents = useMemo(() => students.slice(0, 50), [students]);
  const topBatches = useMemo(() => batches.slice(0, 30), [batches]);
  const topCourses = useMemo(() => courses.slice(0, 20), [courses]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search students, batches, courses, or navigate..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages">
          {pages.map((p) => (
            <CommandItem key={p.path} onSelect={() => go(p.path)}>
              <p.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {topStudents.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Students">
              {topStudents.map((s) => (
                <CommandItem key={s.id} onSelect={() => go(`/students/${s.id}`)}>
                  <GraduationCap className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{s.name}</span>
                  {s.student_id_number && (
                    <span className="ml-2 text-xs text-muted-foreground">{s.student_id_number}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {topBatches.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Batches">
              {topBatches.map((b) => (
                <CommandItem key={b.id} onSelect={() => go(`/batches/${b.id}`)}>
                  <Layers className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{b.batch_name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{b.batch_code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {topCourses.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Courses">
              {topCourses.map((c) => (
                <CommandItem key={c.id} onSelect={() => go(`/courses/${c.id}`)}>
                  <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{c.course_name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{c.course_code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
