import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, X, SlidersHorizontal } from "lucide-react";

export interface StudentFilterValues {
  search: string;
  status: "all" | "active" | "inactive" | "graduated";
  admissionStatus: "all" | "paid" | "partial" | "pending";
  monthlyStatus: "all" | "paid" | "pending" | "overdue";
  sortBy: "name" | "enrollment_date" | "monthly_fee_amount";
  sortOrder: "asc" | "desc";
}

const defaultFilters: StudentFilterValues = {
  search: "",
  status: "all",
  admissionStatus: "all",
  monthlyStatus: "all",
  sortBy: "name",
  sortOrder: "asc",
};

interface Props {
  filters: StudentFilterValues;
  onChange: (filters: StudentFilterValues) => void;
  totalResults: number;
  totalStudents: number;
}

export { defaultFilters };

export default function StudentFilters({ filters, onChange, totalResults, totalStudents }: Props) {
  const [searchInput, setSearchInput] = useState(filters.search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onChange({ ...filters, search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync external filter changes
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  const update = (partial: Partial<StudentFilterValues>) => {
    onChange({ ...filters, ...partial });
  };

  const activeFilterCount = [
    filters.status !== "all",
    filters.admissionStatus !== "all",
    filters.monthlyStatus !== "all",
    filters.search.length > 0,
    filters.sortBy !== "name" || filters.sortOrder !== "asc",
  ].filter(Boolean).length;

  const isDefault =
    filters.search === "" &&
    filters.status === "all" &&
    filters.admissionStatus === "all" &&
    filters.monthlyStatus === "all" &&
    filters.sortBy === "name" &&
    filters.sortOrder === "asc";

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or student ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(""); update({ search: "" }); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter controls row */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filters.status} onValueChange={(v) => update({ status: v as any })}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="graduated">Graduated</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.admissionStatus} onValueChange={(v) => update({ admissionStatus: v as any })}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Admission" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Admission</SelectItem>
              <SelectItem value="paid">Admission Paid</SelectItem>
              <SelectItem value="partial">Admission Partial</SelectItem>
              <SelectItem value="pending">Admission Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.monthlyStatus} onValueChange={(v) => update({ monthlyStatus: v as any })}>
            <SelectTrigger className="w-[155px]">
              <SelectValue placeholder="Monthly" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Monthly</SelectItem>
              <SelectItem value="paid">Monthly Paid</SelectItem>
              <SelectItem value="pending">Monthly Pending</SelectItem>
              <SelectItem value="overdue">Monthly Overdue</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onValueChange={(v) => {
              const [sortBy, sortOrder] = v.split("-") as [StudentFilterValues["sortBy"], StudentFilterValues["sortOrder"]];
              update({ sortBy, sortOrder });
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name A–Z</SelectItem>
              <SelectItem value="name-desc">Name Z–A</SelectItem>
              <SelectItem value="enrollment_date-desc">Newest First</SelectItem>
              <SelectItem value="enrollment_date-asc">Oldest First</SelectItem>
              <SelectItem value="monthly_fee_amount-desc">Fee High–Low</SelectItem>
              <SelectItem value="monthly_fee_amount-asc">Fee Low–High</SelectItem>
            </SelectContent>
          </Select>

          {!isDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearchInput(""); onChange(defaultFilters); }}
              className="text-muted-foreground"
            >
              <X className="mr-1 h-3.5 w-3.5" /> Reset
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Results count when filtered */}
      {!isDefault && (
        <p className="text-sm text-muted-foreground">
          Showing {totalResults} of {totalStudents} students
        </p>
      )}
    </div>
  );
}