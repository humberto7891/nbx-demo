import { useMemo, useState } from "react";
import { VivoHeader } from "@/components/VivoHeader";
import { OfferCard } from "@/components/OfferCard";
import { useInteractions } from "@/hooks/useInteractions";
import { allOffers, getNBXOffers, Offer } from "@/data/offers";
import { ArrowLeft, Check, Sparkles, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Index = () => {
  const { interactions, trackView, reset } = useInteractions();
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const handleConfirmPurchase = () => {
    setConfirmOpen(false);
    setSuccessOpen(true);
  };

  const handleSuccessClose = () => {
    setSuccessOpen(false);
    setActiveOfferId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  if (activeOffer) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <VivoHeader showReset onReset={reset} />
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
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="flex-1 bg-gradient-vivo text-white shadow-vivo hover:opacity-90"
                  onClick={() => setConfirmOpen(true)}
                >
                  Contratar agora
                </Button>
                <Button size="lg" variant="outline" className="flex-1" onClick={goHome}>
                  Ver outras ofertas
                </Button>
              </div>
            </div>
          </div>
        </main>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar contratação</DialogTitle>
              <DialogDescription>
                Você está prestes a contratar <strong>{activeOffer.title}</strong> por{" "}
                <strong className="text-primary">{activeOffer.price}</strong>. Deseja continuar?
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-xl bg-secondary p-4 text-sm text-foreground/80">
              {activeOffer.subtitle}
            </div>
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
                Sua contratação de <strong>{activeOffer.title}</strong> foi realizada com sucesso.
                Em instantes você receberá os detalhes.
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <VivoHeader showReset={hasHistory} onReset={reset} />

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
    </div>
  );
};

export default Index;
