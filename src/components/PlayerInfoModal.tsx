import { SPECIALIZATION_IMAGES } from "@/data/specializationAssets";
import { SPECIALIZATION_DETAILS } from "@/data/specializations";
import type { Specialization } from "@/lib/database.types";
import { getSpecializationColor } from "@/lib/specialization";
import {
  Badge,
  Box,
  Button,
  DialogActionTrigger,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  Flex,
  Heading,
  IconButton,
  Image,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { ReactNode } from "react";
import { FiInfo } from "react-icons/fi";
import SpecializationIcon from "./SpecializationIcon";

interface PlayerInfoModalProps {
  playerName: string;
  specialization: Specialization;
  trigger?: ReactNode;
}

export function PlayerInfoModal({
  playerName,
  specialization,
  trigger,
}: PlayerInfoModalProps) {
  const details = SPECIALIZATION_DETAILS[specialization];
  const color = getSpecializationColor(specialization);

  return (
    <DialogRoot>
      <DialogTrigger asChild>
        {trigger ?? (
          <IconButton
            aria-label="View player info"
            size="xs"
            variant="ghost"
            color="fg.muted"
          >
            <FiInfo />
          </IconButton>
        )}
      </DialogTrigger>
      <Portal>
        <DialogBackdrop />
        <DialogContent
          css={{
            position: "fixed",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            maxHeight: "90vh",
            overflow: "auto",
            width: "100%",
            maxWidth: "640px",
          }}
        >
          <DialogHeader>
            <DialogTitle>
              Player Info
              <Text fontSize="sm" color="fg.muted">
                {playerName}
              </Text>
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
            <VStack gap={4} align="stretch">
              <Flex gap={3} align="center">
                <SpecializationIcon specialization={specialization} size={6} />
                <VStack align="flex-start" gap={1}>
                  <Heading size="md" color="fg">
                    {details.title}
                  </Heading>
                  <Badge colorPalette={color}>{specialization}</Badge>
                </VStack>
              </Flex>

              <Flex gap={6} direction={{ base: "column", md: "row" }}>
                <Box flex="1">
                  <Text color="fg" lineHeight="1.5">
                    {details.description}
                  </Text>
                  <Box mt={4}>
                    <Text
                      fontSize="xs"
                      fontWeight="semibold"
                      color="fg"
                      textTransform="uppercase"
                      letterSpacing="wide"
                    >
                      Equipment
                    </Text>
                    <Box
                      as="ul"
                      mt={2}
                      pl={4}
                      color="fg"
                      lineHeight="1.4"
                      listStyleType="disc"
                    >
                      {details.equipment.map((item) => (
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
                      {details.strategy.map((item) => (
                        <Text as="li" key={item} fontSize="sm">
                          {item}
                        </Text>
                      ))}
                    </Box>
                  </Box>
                </Box>
                <Box flexBasis="220px" flexShrink={0}>
                  <Image
                    src={SPECIALIZATION_IMAGES[specialization]}
                    alt={`${specialization} card`}
                    width="100%"
                    borderRadius="md"
                    borderWidth={1}
                    borderColor="border"
                  />
                </Box>
              </Flex>
            </VStack>
          </DialogBody>

          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button colorPalette="sapphireWool" variant="outline">
                Close
              </Button>
            </DialogActionTrigger>
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </Portal>
    </DialogRoot>
  );
}
