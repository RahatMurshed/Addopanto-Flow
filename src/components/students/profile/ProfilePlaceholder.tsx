interface PlaceholderCardProps {
  text: string;
}

export function PlaceholderCard({ text }: PlaceholderCardProps) {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6 flex items-center justify-center min-h-[120px]">
      <p className="text-muted-foreground text-sm">{text}</p>
    </div>
  );
}
