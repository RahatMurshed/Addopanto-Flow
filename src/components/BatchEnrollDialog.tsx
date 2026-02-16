import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, UserPlus, Users, Loader2, AlertTriangle, X, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAllStudents, useUpdateStudent, type Student, type StudentInsert } from "@/hooks/useStudents";
import { useCompany } from "@/contexts/CompanyContext";
import StudentDialog from "@/components/StudentDialog";

interface BatchEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
  batchName: string;
  onCreateStudent: (data: StudentInsert) => Promise<Student | void>;
}

export default function BatchEnrollDialog({
  open,
  onOpenChange,
  batchId,
  batchName,
  onCreateStudent,
}: BatchEnrollDialogProps) {
  const [tab, setTab] = useState<string>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [addNewOpen, setAddNewOpen] = useState(false);

  const { toast } = useToast();
  const { data: allStudents = [], isLoading } = useAllStudents();
  const updateStudentMutation = useUpdateStudent();
  const { activeCompanyId } = useCompany();

  // Debounce search with 500ms delay
  useEffect(() => {
    if (searchQuery.length < 3) {
      setDebouncedQuery("");
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setDebouncedQuery("");
      setEnrollingId(null);
      setTab("search");
    }
  }, [open]);

  // Filter students for search results
  const searchResults = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 3) return [];
    const q = debouncedQuery.toLowerCase();
    return allStudents
      .filter((s) => {
        return (
          s.name.toLowerCase().includes(q) ||
          (s.student_id_number && s.student_id_number.toLowerCase().includes(q)) ||
          (s.father_name && s.father_name.toLowerCase().includes(q)) ||
          (s.phone && s.phone.includes(q)) ||
          (s.whatsapp_number && s.whatsapp_number.includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.mother_name && s.mother_name.toLowerCase().includes(q)) ||
          (s.roll_number && s.roll_number.toLowerCase().includes(q))
        );
      })
      .slice(0, 20); // Limit to 20 results
  }, [allStudents, debouncedQuery]);

  const handleEnroll = useCallback(async (student: Student) => {
    if (student.batch_id === batchId) {
      toast({ title: "Already enrolled", description: `${student.name} is already in this batch.`, variant: "destructive" });
      return;
    }
    setEnrollingId(student.id);
    try {
      await updateStudentMutation.mutateAsync({ id: student.id, batch_id: batchId });
      toast({ title: "Student enrolled", description: `${student.name} has been enrolled in ${batchName}.` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setEnrollingId(null);
    }
  }, [batchId, batchName, updateStudentMutation, toast, onOpenChange]);

  const isSearching = searchQuery.length >= 3 && debouncedQuery !== searchQuery;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Student to {batchName}</DialogTitle>
            <DialogDescription>
              Search existing students to enroll or create a new student profile.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search" className="gap-2">
                <Search className="h-4 w-4" />
                Search Existing
              </TabsTrigger>
              <TabsTrigger value="new" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add New Student
              </TabsTrigger>
            </TabsList>

            {/* Search Existing Students Tab */}
            <TabsContent value="search" className="flex-1 flex flex-col overflow-hidden mt-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, father name, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Helper text */}
              {searchQuery.length > 0 && searchQuery.length < 3 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Type at least 3 characters to search
                </p>
              )}

              {/* Searching state */}
              {isSearching && (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </div>
              )}

              {/* Results */}
              <ScrollArea className="flex-1 max-h-[400px]">
                {debouncedQuery.length >= 3 && !isSearching && (
                  <div className="space-y-2 pr-3">
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))
                    ) : searchResults.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Users className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No students found matching "{debouncedQuery}"</p>
                        <Button variant="link" size="sm" onClick={() => setTab("new")} className="mt-2">
                          Create a new student instead
                        </Button>
                      </div>
                    ) : (
                      searchResults.map((student) => {
                        const isAlreadyEnrolled = student.batch_id === batchId;
                        const isEnrolling = enrollingId === student.id;
                        return (
                          <Card key={student.id} className={`transition-colors ${isAlreadyEnrolled ? "opacity-60" : "hover:bg-accent/50"}`}>
                            <CardContent className="flex items-center justify-between p-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                                  {student.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm truncate">{student.name}</p>
                                    {student.student_id_number && (
                                      <Badge variant="outline" className="text-[10px] shrink-0">{student.student_id_number}</Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                    {student.father_name && <span>Father: {student.father_name}</span>}
                                    {student.phone && <span>📱 {student.phone}</span>}
                                  </div>
                                  {student.batch_id && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      {isAlreadyEnrolled ? (
                                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                          <AlertTriangle className="h-3 w-3" /> Already in this batch
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1">
                                          <GraduationCap className="h-3 w-3" /> Currently in another batch
                                        </span>
                                      )}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant={isAlreadyEnrolled ? "secondary" : "default"}
                                disabled={isAlreadyEnrolled || isEnrolling}
                                onClick={() => handleEnroll(student)}
                                className="shrink-0 ml-2"
                              >
                                {isEnrolling ? (
                                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Enrolling</>
                                ) : isAlreadyEnrolled ? (
                                  "Enrolled"
                                ) : (
                                  <><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Enroll</>
                                )}
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Empty state when no search */}
                {!debouncedQuery && searchQuery.length < 3 && !isSearching && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">Search your student database</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Search by name, student ID, father name, phone number, or email
                    </p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Add New Student Tab */}
            <TabsContent value="new" className="mt-4">
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                <div className="rounded-full bg-primary/10 p-4">
                  <UserPlus className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Create a new student profile</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The student will be added to your database and enrolled in {batchName}.
                  </p>
                </div>
                <Button onClick={() => { onOpenChange(false); setAddNewOpen(true); }}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Open Student Form
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Separate StudentDialog for Add New Student */}
      <StudentDialog
        open={addNewOpen}
        onOpenChange={setAddNewOpen}
        onSave={onCreateStudent}
        defaultBatchId={batchId}
        lockedBatch
      />
    </>
  );
}
