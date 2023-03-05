import { useMemo } from "react";
import { RelayConfig, RelayMode } from "../classes/relay";
import { normalizeRelayConfigs } from "../helpers/relay";
import relayScoreboardService from "../services/relay-scoreboard";
import { useUserContacts } from "./use-user-contacts";
import { useUserRelays } from "./use-user-relays";

export default function useMergedUserRelays(pubkey: string) {
  const contacts = useUserContacts(pubkey);
  const userRelays = useUserRelays(pubkey);

  return useMemo(() => {
    let relays: RelayConfig[] = userRelays?.relays ?? [];

    // use the relays stored in contacts if there are no relay config
    if (relays.length === 0 && contacts) {
      relays = contacts.relays;
    }

    // normalize relay urls and remove bad ones
    const normalized = normalizeRelayConfigs(relays);

    const rankedUrls = relayScoreboardService.getRankedRelays(normalized.map((r) => r.url));
    return rankedUrls.map((u) => normalized.find((r) => r.url === u) as RelayConfig);
  }, [userRelays, contacts]);
}