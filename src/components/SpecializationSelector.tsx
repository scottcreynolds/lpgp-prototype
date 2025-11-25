import { SPECIALIZATION_IMAGES } from "@/data/specializationAssets";
import {
  SPECIALIZATION_DETAILS,
  SPECIALIZATION_ORDER,
} from "@/data/specializations";
import { getSpecializationColor } from "@/lib/specialization";
import { Box, Flex, Heading, Image, Text } from "@chakra-ui/react";
import type { Specialization } from "../lib/database.types";
import SpecializationIcon from "./SpecializationIcon";

interface SpecializationSelectorProps {
  specialization: Specialization;
  onChange: (spec: Specialization) => void;
}

export function SpecializationDetails({
  specialization,
}: {
  specialization: Specialization;
}) {
  return (
    <Box
      flexBasis={{ lg: "320px" }}
      flexGrow={1}
      p={1}
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      bg="bg"
      w={{ base: "100%", lg: "auto" }}
      maxW={{ base: "100%", lg: "35vw" }}
    >
      <Heading size="sm" mb={2} color="fg.emphasized">
        {SPECIALIZATION_DETAILS[specialization].title}
      </Heading>
      <Text fontSize="sm" color="fg" lineHeight="1.4">
        {SPECIALIZATION_DETAILS[specialization].description}
      </Text>
      <Box mt={4}>
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color="fg"
          textTransform="uppercase"
          letterSpacing="wide"
        >
          Buildable Equipment
        </Text>
        <Box
          as="ul"
          mt={2}
          pl={4}
          color="fg"
          lineHeight="1.4"
          listStyleType="disc"
        >
          {SPECIALIZATION_DETAILS[specialization].equipment.map((item) => (
            <Text as="li" key={item} fontSize="sm">
              {item}
            </Text>
          ))}
        </Box>
      </Box>
      <Box mt={4}>
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color="fg"
          textTransform="uppercase"
          letterSpacing="wide"
        >
          Strategies &amp; alliances
        </Text>
        <Box
          as="ul"
          mt={2}
          pl={4}
          color="fg"
          lineHeight="1.4"
          listStyleType="disc"
        >
          {SPECIALIZATION_DETAILS[specialization].strategy.map((item) => (
            <Text as="li" key={item} fontSize="sm">
              {item}
            </Text>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

export default function SpecializationSelector({
  specialization,
  onChange,
}: SpecializationSelectorProps) {
  return (
    <Flex
      mt={1}
      // keep the right column under the cards until large screens
      direction={{ base: "column", lg: "row" }}
      gap={{ base: 3, lg: 0 }}
      alignItems="flex-start"
    >
      <Flex
        flex="1"
        role="radiogroup"
        direction="row"
        gap={3}
        // allow wrapping so cards flow to multiple rows responsively
        wrap="wrap"
        alignItems="flex-start"
        pr={1}
      >
        {SPECIALIZATION_ORDER.map((spec) => {
          const selected = specialization === spec;
          const colorKey = getSpecializationColor(spec);
          return (
            <Box
              key={spec}
              role="radio"
              aria-checked={selected}
              aria-label={spec}
              tabIndex={0}
              onClick={() => onChange(spec)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange(spec);
                }
              }}
              cursor="pointer"
              position="relative"
              borderWidth={selected ? "3px" : "1px"}
              borderColor={selected ? `${colorKey}.600` : "gray.300"}
              borderRadius="sm"
              p={0}
              flexShrink={0}
              transition="transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, filter 0.15s ease, background-color 0.15s ease"
              _hover={{
                borderColor: selected ? `${colorKey}.700` : `${colorKey}.500`,
                transform: "translateY(-2px)",
                boxShadow: selected ? "lg" : "md",
              }}
              _focusVisible={{
                outline: "none",
                boxShadow: `0 0 0 3px var(--chakra-colors-${colorKey}-200)`,
              }}
              bg={selected ? `${colorKey}.200` : "bg"}
              filter={selected ? "none" : "grayscale(0.4) brightness(0.95)"}
              opacity={selected ? 1 : 0.85}
              _active={{ transform: "scale(0.98)" }}
              display="inline-flex"
              justifyContent="center"
              alignItems="center"
              lineHeight={0}
            >
              <Box
                position="absolute"
                top={3}
                left={3}
                bg={selected ? `${colorKey}.600` : `${colorKey}.400`}
                color="white"
                borderRadius="full"
                p={2}
                boxShadow="sm"
              >
                <SpecializationIcon
                  specialization={spec}
                  size={2}
                  color="white"
                />
              </Box>
              <Image
                src={SPECIALIZATION_IMAGES[spec]}
                alt={`${spec} card`}
                objectFit="contain"
                width="300px"
                height="auto"
                display="block"
                style={{
                  transition: "filter 0.2s ease, transform 0.2s ease",
                  transform: selected ? "scale(1.02)" : "scale(1.0)",
                }}
              />
            </Box>
          );
        })}
      </Flex>
      <SpecializationDetails specialization={specialization} />
    </Flex>
  );
}
