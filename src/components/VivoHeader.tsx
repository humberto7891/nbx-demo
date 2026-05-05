import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VivoHeaderProps {
  onReset?: () => void;
  showReset?: boolean;
}

export const VivoHeader = ({ onReset, showReset }: VivoHeaderProps) => {
  return (
    <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-vivo shadow-glow">
            <span className="text-lg font-extrabold text-white">V</span>
          </div>
          <div>
            <div className="text-lg font-extrabold leading-none tracking-tight text-primary">
              vivo
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              NBX Demo
            </div>
          </div>
        </div>
        {showReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-muted-foreground hover:text-primary"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reiniciar sessão
          </Button>
        )}
      </div>
    </header>
  );
};
