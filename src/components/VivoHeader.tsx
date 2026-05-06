import { RotateCcw, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VivoHeaderProps {
  onReset?: () => void;
  showReset?: boolean;
  cartCount?: number;
  onCartClick?: () => void;
}

export const VivoHeader = ({ onReset, showReset, cartCount = 0, onCartClick }: VivoHeaderProps) => {
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
        <div className="flex items-center gap-1">
          {showReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-muted-foreground hover:text-primary"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Reiniciar sessão</span>
            </Button>
          )}
          {onCartClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCartClick}
              className="relative text-foreground hover:text-primary"
              aria-label="Abrir carrinho"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-vivo px-1 text-[10px] font-bold text-white shadow-vivo">
                  {cartCount}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
