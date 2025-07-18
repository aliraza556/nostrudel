import {
  Button,
  ButtonGroup,
  Card,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Text,
} from "@chakra-ui/react";
import { useObservableEagerState } from "applesauce-react/hooks";
import { NostrEvent } from "nostr-tools";
import { useCallback, useEffect, useState } from "react";

import EventKindsPieChart from "../../../../components/charts/event-kinds-pie-chart";
import EventKindsTable from "../../../../components/charts/event-kinds-table";
import { cacheRelay$ } from "../../../../services/cache-relay";
import localSettings from "../../../../services/preferences";
import WasmRelay from "../../../../services/wasm-relay";
import ExportEventsButton from "./components/export-events-button";
import ImportEventsButton from "./components/import-events-button";

export default function WasmDatabasePage() {
  const cacheRelay = useObservableEagerState(cacheRelay$);
  if (!(cacheRelay instanceof WasmRelay)) return null;
  const worker = cacheRelay.worker;
  if (!worker) return null;

  const [summary, setSummary] = useState<Record<string, number>>();
  const persistForDays = useObservableEagerState(localSettings.wasmPersistForDays);

  const total = summary ? Object.values(summary).reduce((t, v) => t + v, 0) : undefined;

  const refresh = useCallback(async () => {
    await worker.summary().then((v) => setSummary(v));
  }, [setSummary, worker]);

  const importEvents = useCallback(
    async (events: NostrEvent[]) => {
      const batchSize = 100;
      const queue = Array.from(events);

      const next = () => {
        const p: Promise<any>[] = [];
        for (let i = 0; i < batchSize; i++) {
          const event = queue.pop();
          if (!event) break;
          p.push(worker.event(event));
        }

        return Promise.all(p);
      };

      while (queue.length > 0) {
        await next();
        await refresh();
      }
    },
    [worker],
  );
  const exportEvents = useCallback(async () => {
    return worker.query(["REQ", "export", {}]);
  }, [worker]);

  const deleteKind = useCallback(
    async (kind: string) => {
      const k = parseInt(kind);
      if (confirm(`Are you sure you want to delete all kind ${k} events?`)) {
        await worker.delete(["REQ", "delete-" + k, { kinds: [k] }]);
        refresh();
      }
    },
    [worker, refresh],
  );

  const [deleting, setDeleting] = useState(false);
  const deleteDatabase = useCallback(async () => {
    try {
      setDeleting(true);
      if (cacheRelay instanceof WasmRelay) {
        await cacheRelay.wipe();
        location.reload();
      }
    } catch (error) {}
    setDeleting(false);
  }, [cacheRelay]);

  useEffect(() => {
    refresh();
  }, []);

  return (
    <>
      <Text>Wasm Relay Database</Text>
      <Text>Total events: {total ?? "Loading..."}</Text>
      <ButtonGroup flexWrap="wrap">
        <ImportEventsButton onLoad={importEvents} />
        <ExportEventsButton getEvents={exportEvents} />
        <Button colorScheme="red" onClick={deleteDatabase} isLoading={deleting}>
          Delete database
        </Button>
      </ButtonGroup>

      <FormControl>
        <FormLabel>Remove events older than X days</FormLabel>
        <NumberInput
          maxW="xs"
          value={persistForDays ?? undefined}
          onChange={(s, v) => {
            if (Number.isFinite(v)) localSettings.wasmPersistForDays.next(v);
            else localSettings.wasmPersistForDays.clear();
          }}
          step={1000}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
      <Flex gap="2" wrap="wrap" alignItems="flex-start" w="full">
        {summary && (
          <>
            <Card p="2" minW="sm" maxW="lg" flex={1}>
              <Heading size="sm">Events by kind</Heading>
              <EventKindsPieChart kinds={summary} />
            </Card>
            <Card p="2" minW="sm" maxW="md" flex={1}>
              <EventKindsTable kinds={summary} deleteKind={deleteKind} />
            </Card>
          </>
        )}
      </Flex>
    </>
  );
}
