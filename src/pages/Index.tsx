import { useMemo, useState } from "react";
import { VivoHeader } from "@/components/VivoHeader";
import { OfferCard } from "@/components/OfferCard";
import { CartDrawer } from "@/components/CartDrawer";
import { useInteractions } from "@/hooks/useInteractions";
import { useCart, formatPrice, parsePrice } from "@/hooks/useCart";
import { allOffers, getNBXOffers, Offer } from "@/data/offers";
import { ArrowLeft, Check, Sparkles, PartyPopper, ShoppingBag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const { interactions, trackView, reset: resetInteractions } = useInteractions();
  const { items, addItem, removeItem, updateQuantity, clear, totalCount } = useCart();
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const cartTotal = items.reduce((sum, i) => {
    const o = allOffers[i.offerId];
    return o ? sum + parsePrice(o.price) * i.quantity : sum;
  }, 0);

  const handleAddToCart = (offer: Offer) => {
    addItem(offer.id);
    toast({
      title: "Adicionado ao carrinho",
      description: offer.title,
    });
  };

  const handleCheckout = () => {
    setCartOpen(false);
    setConfirmOpen(true);
  };

  const handleConfirmPurchase = () => {
    setConfirmOpen(false);
    setSuccessOpen(true);
  };

  const handleSuccessClose = () => {
    setSuccessOpen(false);
    clear();
    setActiveOfferId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    resetInteractions();
    clear();
  };

  const nbxOffers = useMemo(() => getNBXOffers(interactions), [interactions]);
  const activeOffer: Offer | null = activeOfferId ? allOffers[activeOfferId] : null;
  const hasHistory = interactions.length > 0;

  const openOffer = (id: string) => {
    trackView(id);
    setActiveOfferId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goHome = () => {
    setActiveOfferId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const headerProps = {
    showReset: hasHistory || items.length > 0,
    onReset: handleReset,
    cartCount: totalCount,
    onCartClick: () => setCartOpen(true),
  };

  const cartDrawer = (
    <CartDrawer
      open={cartOpen}
      onOpenChange={setCartOpen}
      items={items}
      onUpdateQuantity={updateQuantity}
      onRemove={removeItem}
      onCheckout={handleCheckout}
    />
  );

  const dialogs = (
    <>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar compra</DialogTitle>
            <DialogDescription>
              Você está finalizando a compra de <strong>{items.length}</strong> item(ns) no
              valor total de{" "}
              <strong className="text-primary">{formatPrice(cartTotal)}</strong>/mês.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-48 space-y-2 overflow-y-auto rounded-xl bg-secondary p-4 text-sm">
            {items.map((i) => {
              const o = allOffers[i.offerId];
              if (!o) return null;
              return (
                <li key={i.offerId} className="flex justify-between gap-2">
                  <span className="truncate">
                    {i.quantity}x {o.title}
                  </span>
                  <span className="font-semibold text-primary">
                    {formatPrice(parsePrice(o.price) * i.quantity)}
                  </span>
                </li>
              );
            })}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-gradient-vivo text-white shadow-vivo hover:opacity-90"
              onClick={handleConfirmPurchase}
            >
              Confirmar compra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={(open) => !open && handleSuccessClose()}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <PartyPopper className="h-7 w-7" />
            </div>
            <DialogTitle className="text-center">Compra confirmada!</DialogTitle>
            <DialogDescription className="text-center">
              Sua contratação foi realizada com sucesso. Em instantes você receberá os
              detalhes por e-mail.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="w-full bg-gradient-vivo text-white shadow-vivo hover:opacity-90"
              onClick={handleSuccessClose}
            >
              Voltar para ofertas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (activeOffer) {
    const inCart = items.find((i) => i.offerId === activeOffer.id);
    return (
      <div className="min-h-screen bg-gradient-soft">
        <VivoHeader {...headerProps} />
        <main className="container py-8">
          <Button
            variant="ghost"
            onClick={goHome}
            className="mb-6 text-primary hover:bg-primary/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para tela inicial
          </Button>

          <div className="grid gap-6 rounded-3xl bg-card p-5 shadow-card-vivo sm:p-8 lg:grid-cols-2 lg:gap-10 lg:p-12">
            <div
              className={`flex items-center justify-center rounded-3xl bg-gradient-to-br ${activeOffer.gradient} p-6 sm:p-8`}
            >
              {activeOffer.image ? (
                <img
                  src={activeOffer.image}
                  alt={activeOffer.title}
                  width={1024}
                  height={1024}
                  className="max-h-[260px] w-auto object-contain drop-shadow-2xl sm:max-h-[360px] lg:max-h-[420px]"
                />
              ) : (
                <div className="text-6xl font-extrabold text-white/90 sm:text-7xl">
                  {activeOffer.title.charAt(0)}
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-widest text-accent">
                {activeOffer.category}
              </span>
              <h1 className="mt-2 text-3xl font-extrabold leading-tight text-foreground sm:text-4xl lg:text-5xl">
                {activeOffer.title}
              </h1>
              <p className="mt-2 text-base text-muted-foreground sm:text-lg">{activeOffer.subtitle}</p>

              <p className="mt-6 text-base leading-relaxed text-foreground/80">
                {activeOffer.description}
              </p>

              <ul className="mt-6 space-y-3">
                {activeOffer.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-3 text-foreground/90">
                    <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="h-4 w-4" />
                    </span>
                    {h}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex items-end justify-between rounded-2xl bg-secondary p-5">
                <div>
                  <div className="text-xs text-muted-foreground">A partir de</div>
                  <div className="text-3xl font-extrabold text-primary">
                    {activeOffer.price}
                  </div>
                </div>
                {inCart && (
                  <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {inCart.quantity} no carrinho
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="flex-1 bg-gradient-vivo text-white shadow-vivo hover:opacity-90"
                  onClick={() => handleAddToCart(activeOffer)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Adicionar ao carrinho
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCartOpen(true)}
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Ver carrinho ({totalCount})
                </Button>
              </div>
            </div>
          </div>
        </main>

        {cartDrawer}
        {dialogs}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <VivoHeader {...headerProps} />

      <section className="relative overflow-hidden bg-gradient-vivo text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="container relative pb-24 pt-12 sm:pb-28 sm:pt-16 lg:pb-32 lg:pt-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest backdrop-blur sm:text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            {hasHistory ? "Recomendado pelo NBX" : "Campanha Vivo"}
          </div>
          <h1 className="mt-5 max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl lg:text-6xl">
            {hasHistory
              ? "Selecionamos as melhores ofertas pra você"
              : "Tudo que você precisa, em um só lugar."}
          </h1>
          <p className="mt-4 max-w-xl text-sm text-white/80 sm:text-base lg:text-lg">
            {hasHistory
              ? "Com base no seu interesse, nosso motor NBX recomendou esta combinação."
              : "Descubra ofertas exclusivas em smartphones, internet e planos para toda a família."}
          </p>
        </div>
      </section>

      <main className="container -mt-16 pb-16 sm:-mt-20">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 rounded-3xl bg-card/80 p-5 shadow-card-vivo backdrop-blur sm:p-6">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">
              {hasHistory ? "Suas 4 ofertas NBX" : "Ofertas em destaque"}
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {hasHistory
                ? "Personalizado em tempo real conforme você interage."
                : "Selecionado pelo time Vivo para você."}
            </p>
          </div>
          {hasHistory && (
            <div className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              {interactions.length} interação(ões)
            </div>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {nbxOffers.map((offer, idx) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              recommended={hasHistory && idx === 0}
              onClick={() => openOffer(offer.id)}
            />
          ))}
        </div>

        <div className="mt-12">
          <h3 className="mb-4 text-lg font-bold text-foreground">Explore mais</h3>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Object.values(allOffers)
              .filter((o) => !nbxOffers.find((n) => n.id === o.id))
              .slice(0, 4)
              .map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  onClick={() => openOffer(offer.id)}
                />
              ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-border/50 bg-background py-6">
        <div className="container text-center text-xs text-muted-foreground">
          Vivo NBX Demo · 09/05 · Caso de Uso 1
        </div>
      </footer>

      {cartDrawer}
      {dialogs}
    </div>
  );
};

export default Index;
