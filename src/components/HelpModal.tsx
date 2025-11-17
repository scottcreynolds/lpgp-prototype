import { Dialog, Heading, Text } from "@chakra-ui/react";
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

  // Ensure this modal does not permanently lock background scrolling.
  // When the help modal is open, lock background scrolling and restore
  // the previous overflow values on close. This keeps the modal panel
  // independent and scrollable while preventing the page behind it
  // from moving.
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;
    if (open) {
      body.style.overflow = "hidden";
      html.style.overflow = "hidden";
    }
    return () => {
      body.style.overflow = prevBodyOverflow;
      html.style.overflow = prevHtmlOverflow;
    };
  }, [open]);

  const handleOpenChange = (e: { open: boolean }) => onOpenChange(e.open);

  const paragraphs = content.split("\n\n");

  // Parse inline markdown for **bold** and *italic* (simple, non-nested)
  const parseInline = (text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    // Match **bold** or *italic* tokens
    const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(text)) !== null) {
      const { index } = match;
      if (index > lastIndex) {
        nodes.push(text.slice(lastIndex, index));
      }
      const token = match[0];
      if (token.startsWith("**") && token.endsWith("**")) {
        const inner = token.slice(2, -2);
        nodes.push(
          <Text as="span" key={index} fontWeight="semibold">
            {inner}
          </Text>
        );
      } else if (token.startsWith("*") && token.endsWith("*")) {
        const inner = token.slice(1, -1);
        nodes.push(
          <Text as="em" key={index} fontStyle="italic">
            {inner}
          </Text>
        );
      } else {
        nodes.push(token);
      }
      lastIndex = index + token.length;
    }
    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex));
    }
    return nodes;
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Backdrop />
      <Dialog.Content
        css={{
          // Fixed + centered dialog. Limit height to viewport so the
          // dialog body can scroll internally for long content.
          position: "fixed",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "85vw",
          maxHeight: "90vh",
          overflow: "visible",
        }}
      >
        <Dialog.Title>
          {topic ? topic.charAt(0).toUpperCase() + topic.slice(1) : "Help"}
        </Dialog.Title>
        {/* Keep the dialog body scrollable so long help content is readable */}
        <Dialog.Body
          style={{ maxHeight: "calc(90vh - 4rem)", overflowY: "auto" }}
        >
          {paragraphs.map((para, idx) => {
            if (para.startsWith("### ")) {
              return (
                <Heading key={idx} as="h3" size="sm" mb={3}>
                  {parseInline(para.slice(4))}
                </Heading>
              );
            }
            if (para.startsWith("## ")) {
              return (
                <Heading key={idx} as="h2" size="md" mb={4}>
                  {parseInline(para.slice(3))}
                </Heading>
              );
            } else {
              return (
                <Text key={idx} mb={4}>
                  {parseInline(para)}
                </Text>
              );
            }
          })}
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  );
}
