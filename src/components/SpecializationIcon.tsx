import type { Specialization } from "@/lib/database.types";
import { specializationTheme } from "@/lib/specialization";
import { Icon } from "@chakra-ui/react";
import type { ComponentProps } from "react";

type SpecIconProps = {
  specialization: Specialization;
  size?: ComponentProps<typeof Icon>["boxSize"];
  color?: string;
} & Omit<ComponentProps<typeof Icon>, "as">;

export default function SpecializationIcon({
  specialization,
  size = 5,
  color,
  ...props
}: SpecIconProps) {
  const {
    icon,
    color: defaultColor,
    label,
  } = specializationTheme[specialization];
  return (
    <Icon
      as={icon}
      boxSize={size}
      color={color ?? `${defaultColor}.500`}
      aria-label={`${label} icon`}
      {...props}
    />
  );
}
