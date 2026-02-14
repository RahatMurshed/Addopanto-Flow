import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useDataManagement } from "@/hooks/useDataManagement";
import { useNavigate } from "react-router-dom";

interface ResetDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "warning" | "confirm" | "password";

const CONFIRMATION_TEXT = "DELETE ALL DATA";
const COOLDOWN_SECONDS = 5;

export function ResetDataDialog({ open, onOpenChange }: ResetDataDialogProps) {
  const navigate = useNavigate();
  const { resetAllData, isResetting } = useDataManagement();

  const [step, setStep] = useState<Step>("warning");
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setStep("warning");
      setConfirmText("");
      setPassword("");
      setCooldown(0);
      setError("");
    }
  }, [open]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleProceedToConfirm = () => {
    setStep("confirm");
  };

  const handleProceedToPassword = () => {
    if (confirmText !== CONFIRMATION_TEXT) {
      setError("Text does not match. Please type exactly: " + CONFIRMATION_TEXT);
      return;
    }
    setError("");
    setStep("password");
    setCooldown(COOLDOWN_SECONDS);
  };

  const handleReset = async () => {
    if (cooldown > 0) return;
    setError("");
    const success = await resetAllData(password);
    if (success) {
      onOpenChange(false);
      navigate("/");
    } else {
      setError("Incorrect password. Please try again.");
    }
  };

  const handleClose = () => {
    if (!isResetting) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === "warning" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-destructive/10 p-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <DialogTitle className="text-destructive">Warning: Permanent Action</DialogTitle>
              </div>
              <DialogDescription className="pt-2">
                This action cannot be undone. All your data will be permanently deleted.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
              <p className="font-medium mb-2">You are about to permanently delete:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• All revenues and allocations</li>
                <li>• All expenses</li>
                <li>• All expense sources</li>
                <li>• All expense source transfers</li>
                <li>• All revenue sources</li>
                <li>• All batches and students</li>
                <li>• All student payments and fee history</li>
              </ul>
              <p className="mt-3 text-sm">
                <strong>Your profile settings will be preserved.</strong>
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleProceedToConfirm}>
                I Understand
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Type <strong>{CONFIRMATION_TEXT}</strong> to confirm you want to delete all data.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="confirm-text">Type confirmation</Label>
                <Input
                  id="confirm-text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={CONFIRMATION_TEXT}
                  className="font-mono"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleProceedToPassword}
                disabled={confirmText !== CONFIRMATION_TEXT}
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "password" && (
          <>
            <DialogHeader>
              <DialogTitle>Enter Your Password</DialogTitle>
              <DialogDescription>
                For security, please enter your password to proceed with the data reset.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isResetting}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isResetting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReset}
                disabled={!password || cooldown > 0 || isResetting}
              >
                {isResetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : cooldown > 0 ? (
                  `Reset All Data (${cooldown})`
                ) : (
                  "Reset All Data"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
