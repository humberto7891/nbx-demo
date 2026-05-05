import { Offer } from "@/data/offers";
import { ArrowRight, Sparkles } from "lucide-react";

interface OfferCardProps {
  offer: Offer;
  recommended?: boolean;
  onClick: () => void;
}

export const OfferCard = ({ offer, recommended, onClick }: OfferCardProps) => {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-3xl text-left transition-smooth hover:scale-[1.02] hover:shadow-vivo bg-gradient-to-br ${offer.gradient} p-6 text-white shadow-card-vivo`}
    >
      {recommended && (
        <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
          <Sparkles className="h-3 w-3" />
          Pra você
        </div>
      )}
      {offer.badge && !recommended && (
        <div className="absolute right-4 top-4 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
          {offer.badge}
        </div>
      )}

      <div className="mb-8 mt-2 text-xs font-semibold uppercase tracking-widest opacity-80">
        {offer.category}
      </div>

      {offer.image && (
        <div className="mb-4 flex h-32 items-center justify-center">
          <img
            src={offer.image}
            alt={offer.title}
            loading="lazy"
            className="h-full w-auto object-contain drop-shadow-2xl transition-smooth group-hover:scale-110"
          />
        </div>
      )}

      <h3 className="text-2xl font-bold leading-tight">{offer.title}</h3>
      <p className="mt-1 text-sm opacity-80">{offer.subtitle}</p>

      <div className="mt-6 flex items-end justify-between">
        <div>
          <div className="text-xs opacity-70">A partir de</div>
          <div className="text-lg font-bold">{offer.price}</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur transition-smooth group-hover:bg-white group-hover:text-primary">
          <ArrowRight className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
};
