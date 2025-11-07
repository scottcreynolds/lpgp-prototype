import type { GameListItem } from "@/lib/database.types";
import { getCurrentGameId } from "@/lib/gameSession";
import { supabase } from "@/lib/supabase";
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
  HStack,
  IconButton,
  Portal,
  Spinner,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FaGamepad, FaTrash } from "react-icons/fa";

function formatDateTime(ts?: string) {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return ts;
  }
}

export default function GamesAdminButton() {
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const gamesQuery = useQuery({
    queryKey: ["admin", "games"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_games");
      if (error) throw new Error(error.message || "Failed to load games");
      return (data || []) as GameListItem[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (gameId: string) => {
      const { error } = await supabase.rpc("delete_game", {
        p_game_id: gameId,
      });
      if (error) throw new Error(error.message || "Failed to delete game");
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "games"] });
    },
  });

  const handleDelete = async (gameId: string) => {
    await deleteMutation.mutateAsync(gameId);
    setConfirmId(null);

    // If we deleted the current game, consider refreshing state (URL still points to it).
    const current = getCurrentGameId();
    if (current === gameId) {
      // No hard navigation here; user can start a new game from header. Keep it simple.
    }
  };

  return (
    <>
      <DialogRoot open={open} onOpenChange={(d) => setOpen(d.open)}>
        <DialogTrigger asChild>
          <Button
            position="fixed"
            bottom="4"
            right="4"
            zIndex="docked"
            colorPalette="gray"
            variant="solid"
          >
            <HStack gap={2}>
              <FaGamepad />
              <Text>Games</Text>
            </HStack>
          </Button>
        </DialogTrigger>

        <Portal>
          <DialogBackdrop />
          <DialogContent
            css={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(960px, 95vw)",
            }}
          >
            <DialogHeader>
              <DialogTitle>Games</DialogTitle>
            </DialogHeader>
            <DialogBody>
              {gamesQuery.isLoading ? (
                <HStack justify="center" py={6}>
                  <Spinner />
                  <Text>Loading…</Text>
                </HStack>
              ) : gamesQuery.data && gamesQuery.data.length > 0 ? (
                <Box overflowX="auto">
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>Updated</Table.ColumnHeader>
                        <Table.ColumnHeader>Round</Table.ColumnHeader>
                        <Table.ColumnHeader>Players</Table.ColumnHeader>
                        <Table.ColumnHeader>Game ID</Table.ColumnHeader>
                        <Table.ColumnHeader></Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {gamesQuery.data.map((g) => (
                        <Table.Row key={g.game_id}>
                          <Table.Cell>
                            {formatDateTime(g.updated_at)}
                          </Table.Cell>
                          <Table.Cell>
                            <HStack gap={2}>
                              <Badge variant="surface">{g.phase}</Badge>
                              <Text>R{g.round}</Text>
                            </HStack>
                          </Table.Cell>
                          <Table.Cell>
                            <VStack align="start" gap={1}>
                              {g.player_names.length > 0 ? (
                                g.player_names.map((n) => (
                                  <Text key={n} fontSize="sm">
                                    {n}
                                  </Text>
                                ))
                              ) : (
                                <Text fontSize="sm" color="fg.muted">
                                  No players
                                </Text>
                              )}
                            </VStack>
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontFamily="mono" fontSize="xs">
                              {g.game_id}
                            </Text>
                          </Table.Cell>
                          <Table.Cell textAlign="right">
                            <IconButton
                              aria-label="Delete game"
                              colorPalette="red"
                              variant="ghost"
                              onClick={() => setConfirmId(g.game_id)}
                            >
                              <FaTrash />
                            </IconButton>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
              ) : (
                <Text color="fg.muted">No games found</Text>
              )}
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Close</Button>
              </DialogActionTrigger>
            </DialogFooter>
            <DialogCloseTrigger />
          </DialogContent>
        </Portal>
      </DialogRoot>

      {/* Confirm delete dialog */}
      <DialogRoot
        open={!!confirmId}
        onOpenChange={(d) => !d.open && setConfirmId(null)}
      >
        <Portal>
          <DialogBackdrop />
          <DialogContent
            css={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(520px, 95vw)",
            }}
          >
            <DialogHeader>
              <DialogTitle>Delete game?</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Text>
                This will permanently remove the game, its players,
                infrastructure, ledger, and contracts. This action cannot be
                undone.
              </Text>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </DialogActionTrigger>
              <Button
                colorPalette="red"
                loading={deleteMutation.isPending}
                onClick={() => confirmId && handleDelete(confirmId)}
              >
                Delete
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </DialogContent>
        </Portal>
      </DialogRoot>
    </>
  );
}
