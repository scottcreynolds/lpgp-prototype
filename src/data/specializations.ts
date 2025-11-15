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
  "Operations Manager",
];

export const SPECIALIZATION_DETAILS: Record<
  Specialization,
  SpecializationDetails
> = {
  "Resource Extractor": {
    title: "Resource Extractor",
    description:
      "You excel at mining and acquiring lunar resources. Use raw materials to build infrastructure, trade, or sell for EV.",
    equipment: [
      "Adaptive mineral harvesters",
      "Autonomous processing rigs",
      "Radiation-hardened transport pods",
    ],
    strategy: [
      "Secure high-yield deposits before other factions",
      "Partner with infrastructure providers to keep refineries online",
      "Offer resource exports as leverage in alliances",
    ],
  },
  "Infrastructure Provider": {
    title: "Infrastructure Provider",
    description:
      "You construct and maintain power and support systems. Other players rely on your ability to keep operations running.",
    equipment: [
      "Regenerative energy arrays",
      "Habitat & life support hubs",
      "Automated maintenance drones",
    ],
    strategy: [
      "Stabilize key corridors so extractors can move freely",
      "Trade infrastructure uptime for access to rare resources",
      "Offer standby services to operations managers for shared growth",
    ],
  },
  "Operations Manager": {
    title: "Operations Management",
    description:
      "You coordinate logistics and habitation. You keep crews healthy, housed, and connected, enabling steady growth.",
    equipment: [
      "Logistics & comms dashboards",
      "Habitat health sensors",
      "Diplomatic liaison consoles",
    ],
    strategy: [
      "Balance alliances between builders and miners",
      "Sequence crew rotations to keep morale high",
      "Broker shared missions that reward collaboration",
    ],
  },
};
