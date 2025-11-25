import type { Specialization } from "@/lib/database.types";

export interface SpecializationDetails {
  title: string;
  description: string;
  equipment: string[];
  strategy: string[];
}

export const SPECIALIZATION_ORDER: Specialization[] = [
  "Resource Extractor",
  "Infrastructure Provider",
];

export const SPECIALIZATION_DETAILS: Record<
  Specialization,
  SpecializationDetails
> = {
  "Resource Extractor": {
    title: "Resource Extractor",
    description:
      "You excel at mining and acquiring lunar resources. Use raw materials to build infrastructure, trade, or sell for EV.",
    equipment: ["H20 Extractor", "Helium-3 Extractor", "Solar Array"],
    strategy: [
      "Secure high-yield deposits before other players.",
      "Partner with infrastructure providers and operations managers to keep refineries online.",
    ],
  },
  "Infrastructure Provider": {
    title: "Infrastructure Provider",
    description:
      "You do a little of everything. You can extract water-ice for EV or construct and maintain power and support systems. Other players rely on your ability to keep operations running.",
    equipment: ["Solar Array", "Habitat", "H20 Extractor"],
    strategy: [
      "Build key infrastructure near resource-rich loactions so extractors can move freely",
      "Trade infrastructure uptime for access to rare resources",
    ],
  },
  "Operations Manager": {
    title: "Operations Manager",
    description:
      "Your facilities don't generate EV directly through resource extraction but you coordinate power, logistics and habitation. You keep crews healthy, housed, and connected, enabling steady growth.",
    equipment: ["Habitat", "Solar Array"],
    strategy: [
      "Sell or lease excess power and crew capacity to other players for per-round EV gains.",
      "Use contracts to your greatest advantage, brokering deals that are beneficial on both sides.",
    ],
  },
};
