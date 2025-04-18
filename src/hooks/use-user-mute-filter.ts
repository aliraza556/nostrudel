import { useCallback, useMemo } from "react";
import { kinds } from "nostr-tools";
import { useActiveAccount } from "applesauce-react/hooks";

import useUserMuteList from "./use-user-mute-list";
import { getPubkeysFromList } from "../helpers/nostr/lists";
import { NostrEvent } from "../types/nostr-event";
import { getStreamHost } from "../helpers/nostr/stream";

export default function useUserMuteFilter(pubkey?: string, additionalRelays?: string[], force?: boolean) {
  const account = useActiveAccount();
  const muteList = useUserMuteList(pubkey || account?.pubkey, additionalRelays, force);
  const pubkeys = useMemo(() => (muteList ? getPubkeysFromList(muteList).map((p) => p.pubkey) : []), [muteList]);

  return useCallback(
    (event: NostrEvent) => {
      if (event.kind === kinds.LiveEvent) {
        const host = getStreamHost(event);
        if (pubkeys.includes(host)) return true;
      }
      return pubkeys.includes(event.pubkey);
    },
    [pubkeys],
  );
}
