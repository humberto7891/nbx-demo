import iphoneImg from "@/assets/iphone17.jpg";

export type Offer = {
  id: string;
  title: string;
  subtitle: string;
  category: "Smartphone" | "Plano" | "Internet" | "TV" | "Acessório" | "Serviço";
  price: string;
  badge?: string;
  image?: string;
  gradient: string;
  description: string;
  highlights: string[];
};

export const allOffers: Record<string, Offer> = {
  "iphone-17-pro-max": {
    id: "iphone-17-pro-max",
    title: "iPhone 17 Pro Max",
    subtitle: "256GB · Titânio Roxo",
    category: "Smartphone",
    price: "R$ 299,90/mês",
    badge: "Lançamento",
    image: iphoneImg,
    gradient: "from-purple-700 to-fuchsia-500",
    description:
      "O mais avançado iPhone já feito. Chip A19 Pro, câmera de 200MP e tela ProMotion de 6.9\". Leve para casa com plano Vivo Selfie ilimitado.",
    highlights: [
      "Chip A19 Pro Bionic",
      "Câmera Pro 200MP + Telefoto 10x",
      "Tela Super Retina XDR 6.9\"",
      "Plano Vivo Selfie 80GB incluso",
    ],
  },
  "plano-vivo-familia": {
    id: "plano-vivo-familia",
    title: "Vivo Família 4 chips",
    subtitle: "Compartilhe 200GB",
    category: "Plano",
    price: "R$ 199,90/mês",
    badge: "Mais vendido",
    gradient: "from-violet-600 to-purple-400",
    description: "Conecte toda a família com 4 chips e 200GB compartilhados.",
    highlights: ["4 chips inclusos", "200GB compartilhados", "Apps ilimitados"],
  },
  "vivo-fibra-1giga": {
    id: "vivo-fibra-1giga",
    title: "Vivo Fibra 1 Giga",
    subtitle: "Internet ultra veloz",
    category: "Internet",
    price: "R$ 149,90/mês",
    badge: "Oferta",
    gradient: "from-fuchsia-600 to-purple-500",
    description: "1 Gbps de velocidade real com Wi-Fi 6 incluso.",
    highlights: ["1 Gbps download", "Wi-Fi 6 grátis", "Instalação sem custo"],
  },
  "vivo-play": {
    id: "vivo-play",
    title: "Vivo Play + Globoplay",
    subtitle: "Streaming combinado",
    category: "TV",
    price: "R$ 49,90/mês",
    gradient: "from-purple-600 to-pink-500",
    description: "Combo de streaming com mais de 80 canais ao vivo.",
    highlights: ["Globoplay incluso", "80+ canais", "Sem fidelidade"],
  },
  "airpods-pro": {
    id: "airpods-pro",
    title: "AirPods Pro 3",
    subtitle: "Cancelamento ativo",
    category: "Acessório",
    price: "R$ 89,90/mês",
    gradient: "from-purple-500 to-violet-400",
    description: "Som imersivo com cancelamento ativo de ruído.",
    highlights: ["ANC adaptativo", "USB-C", "Resistente à água"],
  },
  "vivo-selfie-ilimitado": {
    id: "vivo-selfie-ilimitado",
    title: "Vivo Selfie Ilimitado",
    subtitle: "Apps zero desconto",
    category: "Plano",
    price: "R$ 99,90/mês",
    gradient: "from-violet-700 to-fuchsia-500",
    description: "Internet ilimitada para WhatsApp, Instagram e TikTok.",
    highlights: ["Apps ilimitados", "80GB de internet", "5G+ incluso"],
  },
  "capa-iphone": {
    id: "capa-iphone",
    title: "Capa MagSafe iPhone 17",
    subtitle: "Silicone Roxo",
    category: "Acessório",
    price: "R$ 19,90/mês",
    gradient: "from-fuchsia-500 to-purple-400",
    description: "Proteção premium com MagSafe original.",
    highlights: ["MagSafe", "Silicone premium", "12 cores"],
  },
  "vivo-cloud": {
    id: "vivo-cloud",
    title: "Vivo Cloud 200GB",
    subtitle: "Backup seguro",
    category: "Serviço",
    price: "R$ 14,90/mês",
    gradient: "from-purple-600 to-violet-500",
    description: "Armazenamento na nuvem com sincronização automática.",
    highlights: ["200GB", "Sync automático", "Criptografia"],
  },
};

export const defaultCampaignOfferIds = [
  "plano-vivo-familia",
  "vivo-fibra-1giga",
  "vivo-play",
  "airpods-pro",
];

// NBX: Next Best eXperience
// When a user has interacted with an offer, that offer is promoted as #1
// and the remaining slots filled with default campaign offers.
export function getNBXOffers(interactedIds: string[]): Offer[] {
  const slots = 4;
  const result: Offer[] = [];
  const used = new Set<string>();

  // Most recent interaction first
  const recent = [...interactedIds].reverse();
  for (const id of recent) {
    if (allOffers[id] && !used.has(id)) {
      result.push(allOffers[id]);
      used.add(id);
    }
    if (result.length >= slots) break;
  }

  for (const id of defaultCampaignOfferIds) {
    if (result.length >= slots) break;
    if (!used.has(id) && allOffers[id]) {
      result.push(allOffers[id]);
      used.add(id);
    }
  }

  return result;
}
