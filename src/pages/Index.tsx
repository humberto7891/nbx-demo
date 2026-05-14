import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VivoHeader } from "@/components/VivoHeader";
import { OfferCard } from "@/components/OfferCard";
import { CartDrawer } from "@/components/CartDrawer";
import { useInteractions } from "@/hooks/useInteractions";
import { useCart, formatPrice, parsePrice } from "@/hooks/useCart";
import { buildOfferGridFour, Offer } from "@/data/offers";
import {
  getNbxStaticConfig,
  submitPartyInteraction,
  MVP_CART_ABANDONED,
  MVP_CHECKOUT_STARTED,
  MVP_OFFER_VIEWED,
  MVP_PURCHASE_COMPLETED,
  NBX_INTERACTION_CUSTOMER_ID,
  type MvpInteractionType,
} from "@/lib/nbx/interactions";
import { ensureNbxAccessToken, clearStoredAuthToken } from "@/lib/nbx/auth";
import { getOrCreateCorrelationId, resetCorrelationId } from "@/lib/nbx/correlation";
import { fetchAndBuildDecisionOffers } from "@/lib/nbx/decisionAccess";
import {
  simulateIphonePurchase,
  revertSimulatedIphonePurchase,
  SIMULATOR_IPHONE_PRODUCT_ID,
} from "@/lib/nbx/simulatorPurchase";
import { ArrowLeft, Check, Loader2, Sparkles, PartyPopper, ShoppingBag, Plus } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { interactions, trackView, reset: resetInteractions } = useInteractions();
  const { items, addItem, removeItem, updateQuantity, clear, totalCount } = useCart();
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const skipCartCloseAbandonRef = useRef(false);
  const confirmPurchaseInProgressRef = useRef(false);
  /** Estado atual do carrinho para o onOpenChange do Sheet (evita `items` desatualizado). */
  const cartItemsRef = useRef(items);
  cartItemsRef.current = items;

  /** Ofertas vindas apenas da API NBX (`decision-access` + `product-offerings`). */
  const [gatewayById, setGatewayById] = useState<Record<string, Offer>>({});
  const [decisionOrderedIds, setDecisionOrderedIds] = useState<string[]>([]);
  const [decisionDegraded, setDecisionDegraded] = useState(false);
  const [offersLoading, setOffersLoading] = useState(true);
  const [purchaseConfirmBusy, setPurchaseConfirmBusy] = useState(false);

  const mergedCatalog = gatewayById;

  const cartTotal = items.reduce((sum, i) => {
    const o = mergedCatalog[i.offerId];
    return o ? sum + parsePrice(o.price) * i.quantity : sum;
  }, 0);

  const primaryOffers = useMemo(
    () => buildOfferGridFour(decisionOrderedIds, mergedCatalog, interactions),
    [decisionOrderedIds, mergedCatalog, interactions],
  );

  const exploreOffers = useMemo(() => {
    const primaryIds = new Set(primaryOffers.map((o) => o.id));
    const tail =
      decisionOrderedIds.length > 4
        ? decisionOrderedIds
            .slice(4)
            .map((id) => mergedCatalog[id])
            .filter((o): o is Offer => !!o && !primaryIds.has(o.id))
        : [];
    const need = Math.max(0, 4 - tail.length);
    if (need === 0) return tail.slice(0, 4);

    const tailIds = new Set(tail.map((t) => t.id));
    const fallbackPool = Object.values(mergedCatalog).filter(
      (o) => !primaryIds.has(o.id) && !tailIds.has(o.id),
    );
    fallbackPool.sort((a, b) => {
      const ia = decisionOrderedIds.indexOf(a.id);
      const ib = decisionOrderedIds.indexOf(b.id);
      return (ia === -1 ? 99999 : ia) - (ib === -1 ? 99999 : ib);
    });
    return [...tail, ...fallbackPool.slice(0, need)].slice(0, 4);
  }, [primaryOffers, mergedCatalog, decisionOrderedIds]);

  const usesGatewayOffers = decisionOrderedIds.length > 0;
  const personalized = interactions.length > 0 || usesGatewayOffers;

  const pushNbxInteraction = useCallback(
    (args: { type: MvpInteractionType; description?: string }) => {
      void submitPartyInteraction(args, getOrCreateCorrelationId());
    },
    [],
  );

  useEffect(() => {
    const cfg = getNbxStaticConfig();
    if (!cfg || (import.meta.env.VITE_NBX_ACCESS_TOKEN ?? "").trim()) return;
    void ensureNbxAccessToken(cfg.baseUrl);
  }, []);

  const loadDecisionOffers = useCallback(async () => {
    setOffersLoading(true);
    try {
      if (!getNbxStaticConfig()) {
        setGatewayById({});
        setDecisionOrderedIds([]);
        setDecisionDegraded(false);
        toast({
          title: "NBX não configurado",
          description: "Defina VITE_NBX_GATEWAY_URL para carregar ofertas da API.",
          variant: "destructive",
        });
        return;
      }

      const customerId =
        import.meta.env.VITE_NBX_DECISION_CUSTOMER_ID?.trim() || NBX_INTERACTION_CUSTOMER_ID;

      const parsed = await fetchAndBuildDecisionOffers(customerId);

      if (!parsed) {
        setGatewayById({});
        setDecisionOrderedIds([]);
        setDecisionDegraded(false);
        toast({
          title: "NBX decisão indisponível",
          description:
            "Não foi possível carregar ofertas do gateway. Confira login, customerId e rede (CORS).",
          variant: "destructive",
        });
        return;
      }

      setGatewayById(parsed.offeredById);
      setDecisionOrderedIds(parsed.orderedOfferIds);
      setDecisionDegraded(parsed.degraded);
      if (import.meta.env.DEV && parsed.degradedReason) {
        console.warn("[NBX] decisão degradada:", parsed.degradedReason);
      }
    } finally {
      setOffersLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await loadDecisionOffers();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [loadDecisionOffers]);

  const refreshOffers = useCallback(() => {
    void loadDecisionOffers();
  }, []);

  const handleAddToCart = (offer: Offer) => {
    addItem(offer.id);
    toast({
      title: "Adicionado ao carrinho",
      description: offer.title,
    });
  };

  const handleCheckout = () => {
    skipCartCloseAbandonRef.current = true;
    setCartOpen(false);
    setConfirmOpen(true);
    pushNbxInteraction({
      type: MVP_CHECKOUT_STARTED,
      description: "Usuário iniciou checkout no e-commerce",
    });
    refreshOffers();
  };

  const handleConfirmPurchase = async () => {
    confirmPurchaseInProgressRef.current = true;

    const catalogSnap = mergedCatalog;
    const needsSimulatorPurchase = cartItemsRef.current.some(
      (line) => catalogSnap[line.offerId]?.catalogProductId === SIMULATOR_IPHONE_PRODUCT_ID,
    );

    if (needsSimulatorPurchase) {
      setPurchaseConfirmBusy(true);
      try {
        const cid =
          import.meta.env.VITE_NBX_DECISION_CUSTOMER_ID?.trim() ||
          NBX_INTERACTION_CUSTOMER_ID;
        const sim = await simulateIphonePurchase({ customerId: cid });
        if (!sim.ok) {
          toast({
            title: "Simulador NBX indisponível",
            description: sim.message,
            variant: "destructive",
          });
          confirmPurchaseInProgressRef.current = false;
          return;
        }
      } finally {
        setPurchaseConfirmBusy(false);
      }
    }

    setConfirmOpen(false);
    setSuccessOpen(true);
    pushNbxInteraction({
      type: MVP_PURCHASE_COMPLETED,
      description: "Usuário concluiu a compra no e-commerce",
    });
    refreshOffers();
    queueMicrotask(() => {
      confirmPurchaseInProgressRef.current = false;
    });
  };

  const handleCartOpenChange = (open: boolean) => {
    if (!open) {
      const skipAbandon = skipCartCloseAbandonRef.current;
      skipCartCloseAbandonRef.current = false;
      if (!skipAbandon) {
        const lines = cartItemsRef.current;
        pushNbxInteraction({
          type: MVP_CART_ABANDONED,
          description:
            lines.length > 0
              ? "Usuário fechou o carrinho (drawer com itens)"
              : "Usuário abriu e fechou o carrinho (drawer)",
        });
      }
      refreshOffers();
    }
    setCartOpen(open);
  };

  const handleSuccessClose = () => {
    setSuccessOpen(false);
    clear();
    setActiveOfferId(null);
    refreshOffers();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    const cid =
      import.meta.env.VITE_NBX_DECISION_CUSTOMER_ID?.trim() || NBX_INTERACTION_CUSTOMER_ID;
    void revertSimulatedIphonePurchase({ customerId: cid }).then((r) => {
      if (import.meta.env.DEV && !r.ok)
        console.warn("[NBX simulator] não foi possível reverter compra iPhone:", r.message);
    });

    resetCorrelationId();
    clearStoredAuthToken();
    resetInteractions();
    clear();
  };

  const activeOffer: Offer | null = activeOfferId ? (mergedCatalog[activeOfferId] ?? null) : null;

  const openOffer = (id: string) => {
    trackView(id);
    setActiveOfferId(id);
    pushNbxInteraction({
      type: MVP_OFFER_VIEWED,
      description: "Usuário visualizou uma oferta no e-commerce",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goHome = () => {
    setActiveOfferId(null);
    refreshOffers();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const headerProps = {
    showReset: personalized || items.length > 0,
    onReset: handleReset,
    cartCount: totalCount,
    onCartClick: () => setCartOpen(true),
  };

  const cartDrawer = (
    <CartDrawer
      open={cartOpen}
      onOpenChange={handleCartOpenChange}
      items={items}
      offersById={mergedCatalog}
      onUpdateQuantity={updateQuantity}
      onRemove={removeItem}
      onCheckout={handleCheckout}
    />
  );

  const dialogs = (
    <>
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && purchaseConfirmBusy) return;
          if (!open && !confirmPurchaseInProgressRef.current) {
            pushNbxInteraction({
              type: MVP_CART_ABANDONED,
              description: "Usuário abandonou o carrinho (saiu da confirmação sem comprar)",
            });
            refreshOffers();
          }
          setConfirmOpen(open);
        }}
      >
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
              const o = mergedCatalog[i.offerId];
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
            <Button
              variant="outline"
              disabled={purchaseConfirmBusy}
              onClick={() => setConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="bg-gradient-vivo text-white shadow-vivo hover:opacity-90"
              disabled={purchaseConfirmBusy}
              onClick={() => void handleConfirmPurchase()}
            >
              {purchaseConfirmBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando no simulador…
                </>
              ) : (
                "Confirmar compra"
              )}
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
            {offersLoading
              ? "Carregando ofertas…"
              : usesGatewayOffers
                ? decisionDegraded
                  ? "NBX (resposta degradada)"
                  : "Ofertas do NBX Gateway"
                : personalized
                  ? "Recomendado pelo NBX"
                  : "Campanha Vivo"}
          </div>
          <h1 className="mt-5 max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl lg:text-6xl">
            {offersLoading
              ? "Buscando as melhores opções para você"
              : usesGatewayOffers
                ? "Pacote recomendado para o seu perfil"
                : personalized
                  ? "Selecionamos as melhores ofertas pra você"
                  : "Tudo que você precisa, em um só lugar."}
          </h1>
          <p className="mt-4 max-w-xl text-sm text-white/80 sm:text-base lg:text-lg">
            {offersLoading
              ? "Aguarde enquanto carregamos os produtos do gateway NBX."
              : usesGatewayOffers
                ? "Lista carregada da API de decisão (GET decision-access). Combine com interações para correlacionar na homologação."
                : personalized
                  ? "Com base no seu interesse, nosso motor NBX recomendou esta combinação."
                  : "Descubra ofertas exclusivas em smartphones, internet e planos para toda a família."}
          </p>
        </div>
      </section>

      <main className="container -mt-16 pb-16 sm:-mt-20">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 rounded-3xl bg-card/80 p-5 shadow-card-vivo backdrop-blur sm:p-6">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">
              {offersLoading
                ? "Carregando ofertas"
                : usesGatewayOffers
                  ? "Cards da decisão NBX"
                  : personalized
                    ? "Suas 4 ofertas NBX"
                    : "Ofertas em destaque"}
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {offersLoading
                ? "Produtos vindos exclusivamente da API NBX."
                : usesGatewayOffers
                  ? "Ordenados por rank do motor; dados resolvidos via product-offerings quando disponível."
                  : personalized
                    ? "Personalizado em tempo real conforme você interage."
                    : "Ofertas retornadas pelo gateway NBX."}
            </p>
          </div>
          {personalized && (
            <div className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              {interactions.length} interação(ões)
            </div>
          )}
        </div>

        {offersLoading ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`sk-primary-${i}`}
                  className="flex flex-col gap-3 rounded-3xl border border-border/50 bg-card p-4 shadow-sm"
                >
                  <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-1/3" />
                </div>
              ))}
            </div>

            <div className="mt-12">
              <h3 className="mb-4 text-lg font-bold text-foreground">Explore mais</h3>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={`sk-explore-${i}`}
                    className="flex flex-col gap-3 rounded-3xl border border-border/50 bg-card p-4 shadow-sm"
                  >
                    <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-8 w-1/4" />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : primaryOffers.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
            <p className="text-base font-semibold text-foreground">Nenhuma oferta disponível no momento</p>
            <p className="mt-2 text-sm text-muted-foreground">
              A API não retornou campanhas elegíveis para este cliente ou a resposta veio vazia.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {primaryOffers.map((offer, idx) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  recommended={personalized && idx === 0}
                  onClick={() => openOffer(offer.id)}
                />
              ))}
            </div>

            <div className="mt-12">
              <h3 className="mb-4 text-lg font-bold text-foreground">Explore mais</h3>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {exploreOffers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} onClick={() => openOffer(offer.id)} />
                ))}
              </div>
            </div>
          </>
        )}
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
