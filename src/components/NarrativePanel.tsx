import type { GamePhase } from "@/lib/database.types";
import { getNarrativeForPhase } from "@/lib/narrative";
import {
  Box,
  Collapsible,
  Heading,
  Image,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";

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
          _hover={{ bg: "bg.muted" }}
          transition="background 0.2s"
        >
          <Heading size="lg" color="fg.emphasized" textAlign="left">
            {narrative.title}
          </Heading>
        </Collapsible.Trigger>

        <Collapsible.Content>
          <VStack align="stretch" gap={4} px={6} pb={6}>
            {narrative.image && (
              <Image
                src={narrative.image}
                alt=""
                borderRadius="md"
                objectFit="cover"
                objectPosition="top"
                maxH="20vh"
              />
            )}
            <Text color="fg" whiteSpace="pre-wrap">
              {narrative.text}
            </Text>
          </VStack>
        </Collapsible.Content>
      </Box>
    </Collapsible.Root>
  );
}
