import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CartItem, formatPrice, parsePrice } from "@/hooks/useCart";
import { allOffers } from "@/data/offers";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  onUpdateQuantity: (offerId: string, quantity: number) => void;
  onRemove: (offerId: string) => void;
  onCheckout: () => void;
}

export const CartDrawer = ({
  open,
  onOpenChange,
  items,
  onUpdateQuantity,
  onRemove,
  onCheckout,
}: CartDrawerProps) => {
  const detailedItems = items
    .map((i) => ({ item: i, offer: allOffers[i.offerId] }))
    .filter((x) => x.offer);

  const total = detailedItems.reduce(
    (sum, { item, offer }) => sum + parsePrice(offer.price) * item.quantity,
    0,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Seu carrinho
          </SheetTitle>
          <SheetDescription>
            {detailedItems.length === 0
              ? "Seu carrinho está vazio."
              : `${detailedItems.length} produto(s) selecionado(s).`}
          </SheetDescription>
        </SheetHeader>

        <div className="-mx-6 flex-1 overflow-y-auto px-6 py-4">
          {detailedItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <ShoppingBag className="mb-3 h-12 w-12 opacity-40" />
              <p className="text-sm">Adicione ofertas ao carrinho para continuar.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {detailedItems.map(({ item, offer }) => (
                <li
                  key={offer.id}
                  className="flex gap-3 rounded-2xl border border-border/60 bg-card p-3"
                >
                  <div
                    className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${offer.gradient}`}
                  >
                    {offer.image ? (
                      <img
                        src={offer.image}
                        alt={offer.title}
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-xl font-bold text-white">
                        {offer.title.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold text-foreground">
                          {offer.title}
                        </h4>
                        <p className="truncate text-xs text-muted-foreground">
                          {offer.subtitle}
                        </p>
                      </div>
                      <button
                        onClick={() => onRemove(offer.id)}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                        aria-label="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1 rounded-full border border-border bg-secondary">
                        <button
                          onClick={() => onUpdateQuantity(offer.id, item.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-foreground hover:bg-primary/10 hover:text-primary"
                          aria-label="Diminuir"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(offer.id, item.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-foreground hover:bg-primary/10 hover:text-primary"
                          aria-label="Aumentar"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="text-sm font-bold text-primary">
                        {formatPrice(parsePrice(offer.price) * item.quantity)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {detailedItems.length > 0 && (
          <SheetFooter className="border-t border-border pt-4">
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total mensal</span>
                <span className="text-2xl font-extrabold text-primary">
                  {formatPrice(total)}
                </span>
              </div>
              <Button
                size="lg"
                className="w-full bg-gradient-vivo text-white shadow-vivo hover:opacity-90"
                onClick={onCheckout}
              >
                Concluir compra
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
};
