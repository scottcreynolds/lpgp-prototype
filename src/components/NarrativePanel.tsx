import type { GamePhase } from "@/lib/database.types";
import { getNarrativeForPhase } from "@/lib/narrative";
import {
  Box,
  Collapsible,
  Heading,
  HStack,
  Image,
  Text,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

interface NarrativePanelProps {
  phase: GamePhase;
  round: number;
}

/**
 * Displays narrative content based on the current game phase and round.
 * Auto-expands when new narrative content appears, collapsible by user.
 */
export function NarrativePanel({ phase, round }: NarrativePanelProps) {
  const narrative = useMemo(
    () => getNarrativeForPhase(phase, round),
    [phase, round]
  );

  const [isOpen, setIsOpen] = useState(true);

  // Auto-expand when narrative ID changes
  useEffect(() => {
    if (narrative) {
      setIsOpen(true);
    }
  }, [narrative]);

  if (!narrative) return null;

  return (
    <Collapsible.Root open={isOpen} onOpenChange={(e) => setIsOpen(e.open)}>
      <Box
        bg="bg.panel"
        borderRadius="lg"
        borderWidth={1}
        borderColor="border.emphasized"
        shadow="sm"
        mb={6}
      >
        <Collapsible.Trigger
          width="100%"
          p={6}
          cursor="pointer"
          _hover={{ bg: "bg" }}
          transition="background 0.2s"
        >
          <HStack justify="space-between" align="center">
            <Box fontSize="2xl" color="fg.emphasized">
              {isOpen ? <FiChevronUp /> : <FiChevronDown />}
            </Box>
            <Heading size="lg" color="fg.emphasized" textAlign="left">
              {narrative.title}{" "}
              {isOpen ? "(click to collapse)" : "... (click to expand)"}
            </Heading>
            <Box fontSize="2xl" color="fg.emphasized">
              {isOpen ? <FiChevronUp /> : <FiChevronDown />}
            </Box>
          </HStack>
        </Collapsible.Trigger>

        <Collapsible.Content>
          <HStack align="stretch" gap={4} px={6} pb={6}>
            {narrative.image && (
              <Box flex={narrative.text ? "0 0 50%" : "1"}>
                <Image
                  src={narrative.image}
                  alt=""
                  borderRadius="md"
                  objectFit="contain"
                  objectPosition="top"
                  maxH="30vh"
                  width="100%"
                />
              </Box>
            )}
            {narrative.text && (
              <Box flex="1">
                <Text color="fg" whiteSpace="pre-wrap">
                  {narrative.text}
                </Text>
              </Box>
            )}
          </HStack>
        </Collapsible.Content>
      </Box>
    </Collapsible.Root>
  );
}
