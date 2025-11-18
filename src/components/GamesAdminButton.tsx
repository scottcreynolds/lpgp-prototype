import type { GameListItem } from "@/lib/database.types";
import { getCurrentGameId } from "@/lib/gameSession";
import { supabase } from "@/lib/supabase";
import {
  Badge,
  Box,
  Button,
  HStack,
  IconButton,
  Input,
  Spinner,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  FaExternalLinkAlt,
  FaGamepad,
  FaSearch,
  FaSync,
  FaTrash,
} from "react-icons/fa";

function formatDateTime(ts?: string) {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return ts;
  }
}

interface GamesAdminButtonProps {
  inline?: boolean;
}

export default function GamesAdminButton({
  inline = false,
}: GamesAdminButtonProps) {
  const [open, setOpen] = useState(false); // retained for non-inline legacy modal usage
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const queryClient = useQueryClient();
  const currentGameId = getCurrentGameId();

  const gamesQuery = useQuery({
    queryKey: ["admin", "games"],
    enabled: inline ? true : open,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_games");
      if (error) throw new Error(error.message || "Failed to load games");
      return (data || []) as GameListItem[];
    },
    staleTime: 10_000,
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
    if (getCurrentGameId() === gameId) {
      // If current game deleted, we intentionally do not auto-navigate; user can create a new one.
    }
  };

  if (inline) {
    const filtered = (gamesQuery.data || []).filter((g) => {
      if (!filter.trim()) return true;
      const needle = filter.toLowerCase();
      return (
        g.game_id.toLowerCase().includes(needle) ||
        g.player_names.some((n) => n.toLowerCase().includes(needle)) ||
        g.phase.toLowerCase().includes(needle)
      );
    });

    return (
      <Box borderWidth={1} borderRadius="md" p={3} mt={2} bg="bg.subtle">
        <HStack justify="space-between" mb={2} align="center">
          <HStack gap={2}>
            <FaGamepad />
            <Text fontWeight="semibold" fontSize="sm">
              Games ({filtered.length})
            </Text>
            {gamesQuery.isFetching && <Spinner size="xs" />}
          </HStack>
          <HStack gap={2}>
            <HStack gap={1}>
              <FaSearch style={{ opacity: 0.6 }} />
              <Input
                size="xs"
                placeholder="Filter games..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                width="160px"
              />
            </HStack>
            <IconButton
              aria-label="Refresh games"
              size="xs"
              variant="outline"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["admin", "games"] })
              }
            >
              <FaSync />
            </IconButton>
          </HStack>
        </HStack>
        {gamesQuery.isLoading ? (
          <HStack justify="center" py={4}>
            <Spinner />
            <Text fontSize="sm">Loading…</Text>
          </HStack>
        ) : filtered.length === 0 ? (
          <Text fontSize="sm" color="fg" fontStyle="italic">
            No games found
          </Text>
        ) : (
          <Table.ScrollArea maxH="50vh">
            <Table.Root size="md" variant="outline" width="full">
              <Table.Header bg="bg.panel">
                <Table.Row>
                  <Table.ColumnHeader>Updated</Table.ColumnHeader>
                  <Table.ColumnHeader>Round</Table.ColumnHeader>
                  <Table.ColumnHeader>Players</Table.ColumnHeader>
                  <Table.ColumnHeader>Game ID</Table.ColumnHeader>
                  <Table.ColumnHeader></Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body
                bg="flamingoGold.contrast"
                colorPalette="flamingoGold"
              >
                {filtered.map((g) => (
                  <Table.Row
                    key={g.game_id}
                    bg={g.player_count === 0 ? "gray.100" : "green.100"}
                  >
                    <Table.Cell>{formatDateTime(g.updated_at)}</Table.Cell>
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
                            <Text key={n} fontSize="xs">
                              {n}
                            </Text>
                          ))
                        ) : (
                          <Text fontSize="xs" color="fg" fontStyle="italic">
                            No players
                          </Text>
                        )}
                      </VStack>
                    </Table.Cell>
                    <Table.Cell>
                      <HStack gap={2}>
                        <Text fontFamily="mono" fontSize="sm">
                          {g.game_id}
                        </Text>
                        {currentGameId === g.game_id && (
                          <Badge
                            variant="surface"
                            colorPalette="flamingoGold"
                            size="xs"
                          >
                            current
                          </Badge>
                        )}
                      </HStack>
                    </Table.Cell>
                    <Table.Cell textAlign="right">
                      <HStack justify="end" gap={1}>
                        <IconButton
                          aria-label={`Open game ${g.game_id}`}
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            try {
                              const u = new URL(window.location.href);
                              u.searchParams.set("game", g.game_id);
                              window.open(u.toString(), "_blank");
                            } catch (e) {
                              // fallback
                              console.error(e);
                              window.open(`/?game=${g.game_id}`, "_blank");
                            }
                          }}
                          title="Open game in new tab"
                        >
                          <FaExternalLinkAlt />
                        </IconButton>

                        <IconButton
                          aria-label="Delete game"
                          colorPalette="red"
                          variant="ghost"
                          size="xs"
                          disabled={
                            currentGameId === g.game_id ||
                            deleteMutation.isPending
                          }
                          onClick={() => setConfirmId(g.game_id)}
                          title={
                            currentGameId === g.game_id
                              ? "Cannot delete the current game"
                              : "Delete game"
                          }
                        >
                          <FaTrash />
                        </IconButton>
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        )}
        {confirmId && (
          <HStack mt={3} gap={2}>
            <Text fontSize="xs">Delete game {confirmId}?</Text>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setConfirmId(null)}
            >
              Cancel
            </Button>
            <Button
              size="xs"
              colorPalette="red"
              loading={deleteMutation.isPending}
              onClick={() => handleDelete(confirmId)}
            >
              Delete
            </Button>
          </HStack>
        )}
      </Box>
    );
  }

  // Fallback: original modal behavior (non-inline usage retained if needed elsewhere)
  return (
    <Button
      position="fixed"
      bottom="4"
      right="4"
      zIndex="docked"
      colorPalette="flamingoGold"
      variant="solid"
      size="md"
      onClick={() => setOpen(true)}
    >
      <HStack gap={2}>
        <FaGamepad />
        <Text fontWeight="semibold">Games (modal deprecated)</Text>
      </HStack>
    </Button>
  );
}
