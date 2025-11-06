import {
  Box,
  Button,
  DialogBackdrop,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  Portal,
  Text,
} from "@chakra-ui/react";

interface SetupTipsProps {
  open: boolean;
  onClose: () => void;
}

export function SetupTips({ open, onClose }: SetupTipsProps) {
  return (
    <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <DialogBackdrop />
        <DialogContent
          css={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
        <DialogHeader>
          <DialogTitle>Welcome to Setup</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Text mb={3} color="fg">
            Before Round 1 begins, take a moment to get ready:
          </Text>
          <Box as="ol" pl={5} color="fg" style={{ listStyle: "decimal" }}>
            <Box as="li">Choose your player name.</Box>
            <Box as="li">Select your specialization.</Box>
            <Box as="li">
              Review your starter infrastructure and decide how you want to
              begin.
            </Box>
          </Box>
          <Text mt={3} fontSize="sm" color="fg.muted">
            When everyone is ready, click “Begin Round 1” to enter the
            Governance phase.
          </Text>
        </DialogBody>
        <DialogFooter>
          <Button onClick={onClose} colorPalette="blue">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
      </Portal>
    </DialogRoot>
  );
}
