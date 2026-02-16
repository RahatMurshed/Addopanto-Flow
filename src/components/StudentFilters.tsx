import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, X, SlidersHorizontal, ChevronDown, Filter } from "lucide-react";
import { useBatches } from "@/hooks/useBatches";

export interface StudentFilterValues {
  search: string;
  status: "all" | "active" | "inactive" | "graduated";
  admissionStatus: "all" | "paid" | "partial" | "pending";
  monthlyStatus: "all" | "paid" | "pending" | "overdue";
  sortBy: "name" | "enrollment_date" | "monthly_fee_amount";
  sortOrder: "asc" | "desc";
  // Advanced filters
  batchId: "all" | string;
  gender: "all" | string;
  classGrade: string;
  addressCity: string;
  academicYear: string;
}

const defaultFilters: StudentFilterValues = {
  search: "",
  status: "all",
  admissionStatus: "all",
  monthlyStatus: "all",
  sortBy: "name",
  sortOrder: "asc",
  batchId: "all",
  gender: "all",
  classGrade: "",
  addressCity: "",
  academicYear: "",
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const { data: batches = [] } = useBatches();

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

  // Debounced text filters for classGrade, addressCity, academicYear
  const [classInput, setClassInput] = useState(filters.classGrade);
  const [cityInput, setCityInput] = useState(filters.addressCity);
  const [yearInput, setYearInput] = useState(filters.academicYear);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (classInput !== filters.classGrade) onChange({ ...filters, classGrade: classInput });
    }, 300);
    return () => clearTimeout(timer);
  }, [classInput]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (cityInput !== filters.addressCity) onChange({ ...filters, addressCity: cityInput });
    }, 300);
    return () => clearTimeout(timer);
  }, [cityInput]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (yearInput !== filters.academicYear) onChange({ ...filters, academicYear: yearInput });
    }, 300);
    return () => clearTimeout(timer);
  }, [yearInput]);

  // Sync external changes back
  useEffect(() => { setClassInput(filters.classGrade); }, [filters.classGrade]);
  useEffect(() => { setCityInput(filters.addressCity); }, [filters.addressCity]);
  useEffect(() => { setYearInput(filters.academicYear); }, [filters.academicYear]);

  const update = (partial: Partial<StudentFilterValues>) => {
    onChange({ ...filters, ...partial });
  };

  const advancedFilterCount = [
    filters.batchId !== "all",
    filters.gender !== "all",
    filters.classGrade.length > 0,
    filters.addressCity.length > 0,
    filters.academicYear.length > 0,
  ].filter(Boolean).length;

  const activeFilterCount = [
    filters.status !== "all",
    filters.admissionStatus !== "all",
    filters.monthlyStatus !== "all",
    filters.search.length > 0,
    filters.sortBy !== "name" || filters.sortOrder !== "asc",
  ].filter(Boolean).length + advancedFilterCount;

  const isDefault = JSON.stringify(filters) === JSON.stringify(defaultFilters);

  // Collect active advanced filter chips
  const advancedChips: { label: string; key: keyof StudentFilterValues; resetValue: string }[] = [];
  if (filters.batchId !== "all") {
    const batch = batches.find(b => b.id === filters.batchId);
    advancedChips.push({ label: `Batch: ${batch?.batch_name || "Unknown"}`, key: "batchId", resetValue: "all" });
  }
  if (filters.gender !== "all") {
    advancedChips.push({ label: `Gender: ${filters.gender}`, key: "gender", resetValue: "all" });
  }
  if (filters.classGrade) {
    advancedChips.push({ label: `Class: ${filters.classGrade}`, key: "classGrade", resetValue: "" });
  }
  if (filters.addressCity) {
    advancedChips.push({ label: `City: ${filters.addressCity}`, key: "addressCity", resetValue: "" });
  }
  if (filters.academicYear) {
    advancedChips.push({ label: `Year: ${filters.academicYear}`, key: "academicYear", resetValue: "" });
  }

  const clearChip = (key: keyof StudentFilterValues, resetValue: string) => {
    if (key === "classGrade") setClassInput("");
    if (key === "addressCity") setCityInput("");
    if (key === "academicYear") setYearInput("");
    update({ [key]: resetValue });
  };

  const resetAll = () => {
    setSearchInput("");
    setClassInput("");
    setCityInput("");
    setYearInput("");
    onChange(defaultFilters);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, father name, phone..."
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
              onClick={resetAll}
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

      {/* Advanced Filters Collapsible */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            Advanced Filters
            {advancedFilterCount > 0 && (
              <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                {advancedFilterCount}
              </Badge>
            )}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 rounded-lg border border-border bg-muted/30 p-4">
            {/* Batch */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Batch</label>
              <Select value={filters.batchId} onValueChange={(v) => update({ batchId: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Batches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.batch_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Gender */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Gender</label>
              <Select value={filters.gender} onValueChange={(v) => update({ gender: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Genders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Class/Grade */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Class / Grade</label>
              <Input
                placeholder="e.g. 10th, XII"
                value={classInput}
                onChange={(e) => setClassInput(e.target.value)}
                className="h-9"
              />
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">City</label>
              <Input
                placeholder="Filter by city"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Academic Year */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Academic Year</label>
              <Input
                placeholder="e.g. 2025-26"
                value={yearInput}
                onChange={(e) => setYearInput(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Active filter chips */}
      {advancedChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {advancedChips.map((chip) => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="gap-1 pr-1 cursor-pointer hover:bg-secondary/80"
              onClick={() => clearChip(chip.key, chip.resetValue)}
            >
              {chip.label}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      {/* Results count when filtered */}
      {!isDefault && (
        <p className="text-sm text-muted-foreground">
          Showing {totalResults} of {totalStudents} students
        </p>
      )}
    </div>
  );
}
