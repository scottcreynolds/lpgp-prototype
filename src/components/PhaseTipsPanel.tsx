import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { GamePhase } from "@/lib/database.types";
import { getTipsForPhase } from "@/lib/tips";
import {
  Box,
  Button,
  Card,
  Collapsible,
  HStack,
  Icon,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useMemo } from "react";
import {
  FiAlertTriangle,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiFileText,
  FiInfo,
  FiPackage,
} from "react-icons/fi";

interface PhaseTipsPanelProps {
  phase: GamePhase;
}

const ICON_MAP: Record<string, React.ComponentType> = {
  info: FiInfo,
  time: FiClock,
  contract: FiFileText,
  build: FiPackage,
  alert: FiAlertTriangle,
};

export function PhaseTipsPanel({ phase }: PhaseTipsPanelProps) {
  const tips = useMemo(() => getTipsForPhase(phase), [phase]);

  // open/closed persisted
  const [isOpen, setIsOpen] = useLocalStorage<boolean>("tips.panel.open", true);
  // index persisted per phase
  const [indices, setIndices] = useLocalStorage<Record<GamePhase, number>>(
    "tips.panel.indexByPhase",
    { Setup: 0, Governance: 0, Operations: 0 }
  );

  const count = tips.length;
  const index = Math.min(indices[phase] ?? 0, Math.max(0, count - 1));

  useEffect(() => {
    // Ensure index doesn't exceed new tips length when phase changes
    if (index >= count) {
      setIndices((prev) => ({ ...prev, [phase]: Math.max(0, count - 1) }));
    }
  }, [count, index, phase, setIndices]);

  if (count === 0) return null;

  const tip = tips[index];
  const IconCmp = ICON_MAP[tip.icon] ?? FiInfo;

  function prev() {
    setIndices((prev) => ({
      ...prev,
      [phase]: index > 0 ? index - 1 : count - 1,
    }));
  }
  function next() {
    setIndices((prev) => ({
      ...prev,
      [phase]: index < count - 1 ? index + 1 : 0,
    }));
  }

  return (
    <Card.Root variant="outline" colorPalette="gray">
      <Card.Body>
        <Collapsible.Root open={isOpen} onOpenChange={(e) => setIsOpen(e.open)}>
          <Collapsible.Trigger asChild>
            <Button
              size="sm"
              variant="ghost"
              colorPalette="gray"
              justifyContent="space-between"
              w="full"
            >
              <HStack gap={2} flex={1} justify="flex-start">
                <Icon as={IconCmp} />
                <Text fontWeight="semibold">Helpful Tips</Text>
                <Text color="fg" fontSize="sm">
                  ({phase})
                </Text>
              </HStack>
              <Icon
                as={FiChevronDown}
                transform={isOpen ? "rotate(180deg)" : "rotate(0deg)"}
                transition="transform 0.2s"
              />
            </Button>
          </Collapsible.Trigger>

          <Collapsible.Content>
            <VStack
              align="stretch"
              mt={3}
              gap={3}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  prev();
                } else if (e.key === "ArrowRight") {
                  e.preventDefault();
                  next();
                }
              }}
              tabIndex={0}
            >
              <HStack gap={3} align="flex-start">
                <Icon as={IconCmp} color="fg" boxSize={5} mt={1} />
                <Text color="fg">{tip.text}</Text>
              </HStack>

              {count > 1 && (
                <HStack justify="space-between">
                  <HStack gap={2}>
                    <IconButton
                      aria-label="Previous tip"
                      size="xs"
                      variant="subtle"
                      onClick={prev}
                    >
                      <Icon as={FiChevronLeft} />
                    </IconButton>
                    <IconButton
                      aria-label="Next tip"
                      size="xs"
                      variant="subtle"
                      onClick={next}
                    >
                      <Icon as={FiChevronRight} />
                    </IconButton>
                  </HStack>
                  <Box as="span" color="fg" fontSize="sm">
                    {index + 1}/{count}
                  </Box>
                </HStack>
              )}
            </VStack>
          </Collapsible.Content>
        </Collapsible.Root>
      </Card.Body>
    </Card.Root>
  );
}
