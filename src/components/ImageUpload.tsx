import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  onFileSelect: (file: File) => void;
  label?: string;
  variant?: "avatar" | "logo";
  fallbackText?: string;
  className?: string;
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  onFileSelect,
  label = "Upload Image",
  variant = "avatar",
  fallbackText = "",
  className,
  disabled,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayUrl = preview || value;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Only PNG, JPG, and WebP images are allowed");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Image must be less than 2MB");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);
    onFileSelect(file);
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const initials = fallbackText
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-3">
        {variant === "avatar" ? (
          <Avatar className="h-16 w-16">
            {displayUrl ? (
              <AvatarImage src={displayUrl} alt="Preview" className="object-cover" />
            ) : null}
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {initials || <ImageIcon className="h-6 w-6 text-muted-foreground" />}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 overflow-hidden">
            {displayUrl ? (
              <img src={displayUrl} alt="Preview" className="h-full w-full object-contain" />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              {displayUrl ? "Change" : label}
            </Button>
            {displayUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={disabled}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">PNG, JPG or WebP. Max 2MB.</p>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
    </div>
  );
}
