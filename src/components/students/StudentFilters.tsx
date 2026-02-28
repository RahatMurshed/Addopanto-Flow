import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { Switch } from "@/components/ui/switch";
import { Search, X, SlidersHorizontal, ChevronDown, Filter, MapPin, Loader2 } from "lucide-react";
import SearchBar from "@/components/shared/SearchBar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBatches } from "@/hooks/useBatches";

export interface StudentFilterValues {
  search: string;
  status: "all" | "active" | "inactive" | "graduated" | "dropout" | "inquiry";
  admissionStatus: "all" | "paid" | "partial" | "pending";
  monthlyStatus: "all" | "paid" | "pending" | "overdue";
  sortBy: "name" | "enrollment_date" | "monthly_fee_amount" | "student_id_number" | "date_of_birth" | "class_grade" | "created_at";
  sortOrder: "asc" | "desc";
  // Advanced filters
  batchId: "all" | string;
  gender: "all" | string;
  classGrade: string;
  addressCity: string;
  addressState: string;
  addressArea: string;
  addressPinZip: string;
  academicYear: string;
  includeAltContact: boolean;
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
  addressState: "",
  addressArea: "",
  addressPinZip: "",
  academicYear: "",
  includeAltContact: true,
};

interface Props {
  filters: StudentFilterValues;
  onChange: (filters: StudentFilterValues) => void;
  totalResults: number;
  totalStudents: number;
}

export { defaultFilters };

export default function StudentFilters({ filters, onChange, totalResults, totalStudents }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const { data: batches = [] } = useBatches();

  // Local state for advanced text inputs (applied on button click)
  const [classInput, setClassInput] = useState(filters.classGrade);
  const [cityInput, setCityInput] = useState(filters.addressCity);
  const [stateInput, setStateInput] = useState(filters.addressState);
  const [areaInput, setAreaInput] = useState(filters.addressArea);
  const [pinInput, setPinInput] = useState(filters.addressPinZip);
  const [yearInput, setYearInput] = useState(filters.academicYear);

  // Sync external changes back
  useEffect(() => { setClassInput(filters.classGrade); }, [filters.classGrade]);
  useEffect(() => { setCityInput(filters.addressCity); }, [filters.addressCity]);
  useEffect(() => { setStateInput(filters.addressState); }, [filters.addressState]);
  useEffect(() => { setAreaInput(filters.addressArea); }, [filters.addressArea]);
  useEffect(() => { setPinInput(filters.addressPinZip); }, [filters.addressPinZip]);
  useEffect(() => { setYearInput(filters.academicYear); }, [filters.academicYear]);

  const applyAdvancedTextFilters = () => {
    onChange({
      ...filters,
      classGrade: classInput,
      addressCity: cityInput,
      addressState: stateInput,
      addressArea: areaInput,
      addressPinZip: pinInput,
      academicYear: yearInput,
    });
  };

  const update = (partial: Partial<StudentFilterValues>) => {
    onChange({ ...filters, ...partial });
  };

  const advancedFilterCount = [
    filters.batchId !== "all",
    filters.gender !== "all",
    filters.classGrade.length > 0,
    filters.addressCity.length > 0,
    filters.addressState.length > 0,
    filters.addressArea.length > 0,
    filters.addressPinZip.length > 0,
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
  if (filters.addressState) {
    advancedChips.push({ label: `State: ${filters.addressState}`, key: "addressState", resetValue: "" });
  }
  if (filters.addressArea) {
    advancedChips.push({ label: `Area: ${filters.addressArea}`, key: "addressArea", resetValue: "" });
  }
  if (filters.addressPinZip) {
    advancedChips.push({ label: `PIN: ${filters.addressPinZip}`, key: "addressPinZip", resetValue: "" });
  }
  if (filters.academicYear) {
    advancedChips.push({ label: `Year: ${filters.academicYear}`, key: "academicYear", resetValue: "" });
  }

  const clearChip = (key: keyof StudentFilterValues, resetValue: string) => {
    if (key === "classGrade") setClassInput("");
    if (key === "addressCity") setCityInput("");
    if (key === "addressState") setStateInput("");
    if (key === "addressArea") setAreaInput("");
    if (key === "addressPinZip") setPinInput("");
    if (key === "academicYear") setYearInput("");
    update({ [key]: resetValue });
  };

  const resetAll = () => {
    setClassInput("");
    setCityInput("");
    setStateInput("");
    setAreaInput("");
    setPinInput("");
    setYearInput("");
    onChange(defaultFilters);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="flex-1">
          <SearchBar
            placeholder="Search name, ID, father, phone..."
            onSearch={(val) => update({ search: val })}
            defaultValue={filters.search}
          />
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
              <SelectItem value="inquiry">Inquiry</SelectItem>
              <SelectItem value="graduated">Graduated</SelectItem>
              <SelectItem value="dropout">Dropout</SelectItem>
            </SelectContent>
          </Select>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
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
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-[200px]">
              This filter applies to the current page only
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
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
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-[200px]">
              This filter applies to the current page only
            </TooltipContent>
          </Tooltip>

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
              <SelectItem value="enrollment_date-desc">Newest Enrolled</SelectItem>
              <SelectItem value="enrollment_date-asc">Oldest Enrolled</SelectItem>
              <SelectItem value="monthly_fee_amount-desc">Fee High–Low</SelectItem>
              <SelectItem value="monthly_fee_amount-asc">Fee Low–High</SelectItem>
              <SelectItem value="student_id_number-asc">Student ID A–Z</SelectItem>
              <SelectItem value="date_of_birth-asc">DOB Oldest</SelectItem>
              <SelectItem value="date_of_birth-desc">DOB Newest</SelectItem>
              <SelectItem value="class_grade-asc">Class A–Z</SelectItem>
              <SelectItem value="created_at-desc">Recently Added</SelectItem>
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
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
            {/* Row 1: General filters */}
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
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

            {/* Row 2: Address group */}
            <div className="rounded-md border border-border/60 bg-background/50 p-3 space-y-2.5">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Address Filters</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Area / Locality</label>
                  <Input
                    placeholder="e.g. Lajpat Nagar"
                    value={areaInput}
                    onChange={(e) => setAreaInput(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">City</label>
                  <Input
                    placeholder="e.g. New Delhi"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">State</label>
                  <Input
                    placeholder="e.g. Maharashtra"
                    value={stateInput}
                    onChange={(e) => setStateInput(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">PIN / ZIP</label>
                  <Input
                    placeholder="e.g. 110024"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Apply button + search options */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="include-alt-contact"
                  checked={filters.includeAltContact}
                  onCheckedChange={(v) => onChange({ ...filters, includeAltContact: v })}
                />
                <label htmlFor="include-alt-contact" className="text-sm text-muted-foreground cursor-pointer">
                  Include alternate contact in search
                </label>
              </div>
              <Button size="sm" onClick={applyAdvancedTextFilters} className="gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                Apply Filters
              </Button>
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
