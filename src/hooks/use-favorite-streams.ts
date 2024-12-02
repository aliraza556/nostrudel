import { kinds } from "nostr-tools";
import { getAddressPointersFromList } from "applesauce-lists/helpers/general";

import useReplaceableEvent from "./use-replaceable-event";
import useCurrentAccount from "./use-current-account";
import useReplaceableEvents from "./use-replaceable-events";

export const FAVORITE_STREAMS_IDENTIFIER = "nostrudel-favorite-streams";

export default function useFavoriteStreams(pubkey?: string) {
  const account = useCurrentAccount();
  const key = pubkey || account?.pubkey;

  const favorites = useReplaceableEvent(
    key ? { kind: kinds.Application, pubkey: key, identifier: FAVORITE_STREAMS_IDENTIFIER } : undefined,
  );

  const streams = useReplaceableEvents(favorites ? getAddressPointersFromList(favorites) : []);

  return { streams, favorites };
}
