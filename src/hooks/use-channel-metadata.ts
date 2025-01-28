import { useMemo } from "react";
import { useStoreQuery } from "applesauce-react/hooks";
import { ChannelMetadataQuery } from "applesauce-core/queries";

import channelMetadataService from "../services/channel-metadata";
import useSingleEvent from "./use-single-event";

export default function useChannelMetadata(
  channelId: string | undefined,
  relays: Iterable<string> = [],
  force?: boolean,
) {
  const channel = useSingleEvent(channelId);
  useMemo(() => {
    if (!channelId) return;
    return channelMetadataService.requestMetadata(relays, channelId, { alwaysRequest: force, ignoreCache: force });
  }, [channelId, Array.from(relays).join("|"), force]);

  const metadata = useStoreQuery(ChannelMetadataQuery, channel && [channel]);

  return metadata;
}
