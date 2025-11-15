import { Box, Dialog, Heading, Text, VStack } from "@chakra-ui/react";
import phaseSummaries from "../data/phaseSummaries.json";
import type { GamePhase } from "../lib/database.types";

interface PhaseSummaryModalProps {
  phase: GamePhase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PhaseSummaryModal({
  phase,
  open,
  onOpenChange,
}: PhaseSummaryModalProps) {
  const summary = phaseSummaries[phase];

  if (!summary) {
    return null;
  }

  const handleOpenChange = (e: { open: boolean }) => {
    onOpenChange(e.open);
  };

  const renderTextWithParagraphs = (text: string) => {
    return text.split("\n\n").map((paragraph, index) => (
      <Text key={index} mb={4}>
        {paragraph}
      </Text>
    ));
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={handleOpenChange}
      scrollBehavior="outside"
    >
      <Dialog.Backdrop />
      <Dialog.Content
        css={{
          position: "fixed",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          maxWidth: "80vw",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
        p={6}
      >
        <Dialog.Header>
          <Dialog.Title>{phase} Phase Summary</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <VStack align="stretch" gap={6}>
            <Box>
              <Heading size="md" mb={3}>
                Description
              </Heading>
              {renderTextWithParagraphs(summary.description)}
            </Box>
            <Box>
              <Heading size="md" mb={3}>
                Action
              </Heading>
              {renderTextWithParagraphs(summary.action)}
            </Box>
            <Box>
              <Heading size="md" mb={3}>
                Strategies
              </Heading>
              {renderTextWithParagraphs(summary.strategies)}
            </Box>
          </VStack>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.ActionTrigger asChild>
            <button>Close</button>
          </Dialog.ActionTrigger>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
