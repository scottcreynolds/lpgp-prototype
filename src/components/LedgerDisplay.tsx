import {
  Badge,
  Box,
  Heading,
  HStack,
  NativeSelect,
  Table,
  Text,
  IconButton,
} from "@chakra-ui/react";
import { FaDownload } from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import { getCurrentGameId } from "@/lib/gameSession";
import { useState } from "react";
import { useLedger } from "../hooks/useGameData";
import type { DashboardPlayer, LedgerEntry } from "../lib/database.types";

interface LedgerDisplayProps {
  players: DashboardPlayer[];
  currentRound: number;
}

const transactionTypeLabels: Record<string, string> = {
  GAME_START: "Game Start",
  GAME_ENDED: "Game Ended",
  INFRASTRUCTURE_BUILT: "Infrastructure Built",
  INFRASTRUCTURE_MAINTENANCE: "Maintenance",
  INFRASTRUCTURE_YIELD: "Yield",
  CONTRACT_CREATED: "Contract Created",
  CONTRACT_PAYMENT: "Contract Payment",
  CONTRACT_ENDED: "Contract Ended",
  CONTRACT_BROKEN: "Contract Broken",
  INFRASTRUCTURE_ACTIVATED: "Infrastructure Activated",
  INFRASTRUCTURE_DEACTIVATED: "Infrastructure Deactivated",
  MANUAL_ADJUSTMENT: "Manual Adjustment",
};

const transactionTypeColors: Record<string, string> = {
  GAME_START: "blue",
  GAME_ENDED: "purple",
  INFRASTRUCTURE_BUILT: "purple",
  INFRASTRUCTURE_MAINTENANCE: "orange",
  INFRASTRUCTURE_YIELD: "green",
  CONTRACT_CREATED: "cyan",
  CONTRACT_PAYMENT: "teal",
  CONTRACT_ENDED: "gray",
  CONTRACT_BROKEN: "red",
  INFRASTRUCTURE_ACTIVATED: "green",
  INFRASTRUCTURE_DEACTIVATED: "gray",
  MANUAL_ADJUSTMENT: "yellow",
};

export function LedgerDisplay({ players, currentRound }: LedgerDisplayProps) {
  const [filterPlayerId, setFilterPlayerId] = useState<string>("all");
  const [filterRound, setFilterRound] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const { data: ledgerEntries, isLoading } = useLedger(
    filterPlayerId === "all" ? undefined : filterPlayerId,
    filterRound === "all" ? undefined : parseInt(filterRound)
  );

  const getPlayerName = (playerId: string | null) => {
    if (!playerId) return "System";
    return players.find((p) => p.id === playerId)?.name || "Unknown";
  };

  const formatChange = (value: number) => {
    if (value === 0) return "0";
    return value > 0 ? `+${value}` : `${value}`;
  };

  const getChangeColor = (value: number) => {
    if (value === 0) return "gray.700";
    return value > 0 ? "green.600" : "red.600";
  };

  if (isLoading) {
    return (
      <Box
        bg="bg.panel"
        p={6}
        borderRadius="lg"
        borderWidth={1}
        borderColor="border"
        shadow="sm"
      >
        <Text>Loading ledger...</Text>
      </Box>
    );
  }

  // Generate round options
  const roundOptions = Array.from({ length: currentRound + 1 }, (_, i) => i);

  return (
    <Box
      bg="bg.panel"
      p={6}
      borderRadius="lg"
      borderWidth={1}
      borderColor="border"
      shadow="sm"
    >
      <Heading size="lg" mb={4} color="fg">
        Transaction Ledger
      </Heading>

      {/* Filters */}
      <HStack gap={4} mb={4}>
        <Box flex={1}>
          <Text fontSize="sm" fontWeight="semibold" mb={2} color="fg">
            Filter by Player
          </Text>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={filterPlayerId}
              onChange={(e) => setFilterPlayerId(e.target.value)}
            >
              <option value="all">All Players</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Box>

        <Box flex={1}>
          <Text fontSize="sm" fontWeight="semibold" mb={2} color="fg">
            Filter by Round
          </Text>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={filterRound}
              onChange={(e) => setFilterRound(e.target.value)}
            >
              <option value="all">All Rounds</option>
              {roundOptions.map((round) => (
                <option key={round} value={round}>
                  Round {round}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Box>
        <HStack gap={2}>
          <IconButton
            aria-label="Export ledger CSV"
            size="sm"
            variant="subtle"
            onClick={async () => {
              setExporting(true);
              try {
                const gameId = getCurrentGameId();
                const { data, error } = await supabase
                  .from("ledger_entries")
                  .select("*, players(name)")
                  .eq("game_id", gameId as string)
                  .order("created_at", { ascending: false });

                if (error) throw error;
                const rows = (data || []) as any[];

                const cols = [
                  "id",
                  "round",
                  "player_id",
                  "player_name",
                  "transaction_type",
                  "ev_change",
                  "rep_change",
                  "reason",
                  "processed",
                  "infrastructure_id",
                  "contract_id",
                  "metadata",
                  "created_at",
                  "game_id",
                ];

                const escape = (v: any) => {
                  if (v === null || v === undefined) return "";
                  const s = typeof v === "string" ? v : JSON.stringify(v);
                  return `"${s.replace(/"/g, '""')}"`;
                };

                const csv = [cols.join(",")]
                  .concat(
                    rows.map((r) =>
                      cols
                        .map((c) => {
                          if (c === "player_name") {
                            return escape(r.players?.name ?? r.player_name ?? "");
                          }
                          if (c === "metadata") return escape(r.metadata ?? "");
                          return escape(r[c]);
                        })
                        .join(",")
                    )
                  )
                  .join("\n");

                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                const ts = new Date().toISOString().replace(/[:.]/g, "-");
                a.download = `ledger-${gameId ?? "unknown"}-${ts}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              } catch (e) {
                console.error("Export failed", e);
                // best-effort: ignore UI feedback here
              } finally {
                setExporting(false);
              }
            }}
            loading={exporting}
            title="Export full ledger as CSV"
          >
            <FaDownload />
          </IconButton>
        </HStack>
      </HStack>

      {/* Ledger Table */}
      {!ledgerEntries || ledgerEntries.length === 0 ? (
        <Box p={8} textAlign="center">
          <Text color="fg" fontSize="lg">
            No transactions found
          </Text>
          <Text color="fg" fontSize="sm" mt={2}>
            {filterPlayerId !== "all" || filterRound !== "all"
              ? "Try adjusting your filters"
              : "Transactions will appear here as the game progresses"}
          </Text>
        </Box>
      ) : (
        <Table.ScrollArea maxH="500px">
          <Table.Root
            interactive
            colorPalette="softOchre"
            size="sm"
            variant="outline"
            bg="bg"
          >
            <Table.Header bg="bg">
              <Table.Row>
                <Table.ColumnHeader fontWeight="bold" color="fg">
                  Round
                </Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="bold" color="fg">
                  Player
                </Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="bold" color="fg">
                  Type
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontWeight="bold"
                  color="fg"
                  textAlign="right"
                >
                  EV Δ
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontWeight="bold"
                  color="fg"
                  textAlign="right"
                >
                  REP Δ
                </Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="bold" color="fg">
                  Reason
                </Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="bold" color="fg">
                  Status
                </Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="bold" color="fg">
                  Timestamp
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body bg="boldTangerine.contrast">
              {ledgerEntries.map((entry: LedgerEntry) => (
                <Table.Row key={entry.id}>
                  <Table.Cell>
                    <Badge colorPalette="blue" size="sm">
                      R{entry.round}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" fontWeight="medium">
                      {entry.players?.name || getPlayerName(entry.player_id)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      colorPalette={
                        transactionTypeColors[entry.transaction_type] || "gray"
                      }
                      size="sm"
                    >
                      {transactionTypeLabels[entry.transaction_type] ||
                        entry.transaction_type}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text
                      fontSize="sm"
                      fontWeight="semibold"
                      color={getChangeColor(entry.ev_change)}
                    >
                      {formatChange(entry.ev_change)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text
                      fontSize="sm"
                      fontWeight="semibold"
                      color={getChangeColor(entry.rep_change)}
                    >
                      {formatChange(entry.rep_change)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="xs" color="fg" maxW="300px">
                      {entry.reason}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      colorPalette={entry.processed ? "green" : "gray"}
                      size="sm"
                    >
                      {entry.processed ? "Processed" : "Pending"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="xs" color="fg">
                      {new Date(entry.created_at).toLocaleString()}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
      )}
    </Box>
  );
}
