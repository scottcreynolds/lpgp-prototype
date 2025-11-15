import { Dialog, Text, Heading } from "@chakra-ui/react";
import { useEffect, useState } from "react";

interface HelpModalProps {
  topic: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpModal({ topic, open, onOpenChange }: HelpModalProps) {
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    if (topic) {
      // Load the JSON file for the topic
      import(`../data/${topic}.json`)
        .then((data) => {
          setContent(data.content);
        })
        .catch((error) => {
          console.error("Failed to load help content:", error);
          setContent("Help content not found.");
        });
    }
  }, [topic]);

  const handleOpenChange = (e: { open: boolean }) => onOpenChange(e.open);

  const paragraphs = content.split("\n\n");

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Backdrop />
      <Dialog.Content
        css={{
          position: "fixed",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "80vw",
          maxHeight: "none",
          overflowY: "auto",
        }}
      >
        <Dialog.Title>
          {topic ? topic.charAt(0).toUpperCase() + topic.slice(1) : "Help"}
        </Dialog.Title>
        <Dialog.Body>
          {paragraphs.map((para, idx) => {
            if (para.startsWith("## ")) {
              return (
                <Heading key={idx} as="h2" size="md" mb={4}>
                  {para.slice(3)}
                </Heading>
              );
            } else {
              return (
                <Text key={idx} mb={4}>
                  {para}
                </Text>
              );
            }
          })}
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  );
}
