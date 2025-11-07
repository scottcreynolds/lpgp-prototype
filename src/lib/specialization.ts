import type { Specialization } from "@/lib/database.types";
import React from "react";
import { GiMiningHelmet } from "react-icons/gi";
import { MdManageAccounts, MdSolarPower } from "react-icons/md";

export const specializationTheme: Record<
  Specialization,
  { icon: React.ComponentType; color: string; label: string }
> = {
  "Resource Extractor": {
    icon: GiMiningHelmet,
    color: "orange",
    label: "Resource Extractor",
  },
  "Infrastructure Provider": {
    icon: MdSolarPower,
    color: "blue",
    label: "Infrastructure Provider",
  },
  "Operations Manager": {
    icon: MdManageAccounts,
    color: "green",
    label: "Operations Management",
  },
};

export const getSpecializationColor = (spec: Specialization) =>
  specializationTheme[spec].color;
