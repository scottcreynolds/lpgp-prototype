import infrastructureProviderImg from "@/assets/player-cards/infrastructure-provider.png";
import operationsManagerImg from "@/assets/player-cards/operations-manager.png";
import resourceExtractorImg from "@/assets/player-cards/resource-extractor.png";
import type { Specialization } from "@/lib/database.types";

export const SPECIALIZATION_IMAGES: Record<Specialization, string> = {
  "Resource Extractor": resourceExtractorImg,
  "Infrastructure Provider": infrastructureProviderImg,
  "Operations Manager": operationsManagerImg,
};
