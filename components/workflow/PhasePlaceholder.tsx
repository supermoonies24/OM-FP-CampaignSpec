import { Construction } from "lucide-react";

interface PhasePlaceholderProps {
  title: string;
  phase: string;
  description: string;
}

export function PhasePlaceholder({ title, phase, description }: PhasePlaceholderProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
          <Construction className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground">Scaffolded in Phase 0 · implementation in {phase}</p>
      </div>
    </div>
  );
}
