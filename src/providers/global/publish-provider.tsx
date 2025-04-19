import { useToast } from "@chakra-ui/react";
import { addSeenRelay, mergeRelaySets } from "applesauce-core/helpers";
import { useActiveAccount } from "applesauce-react/hooks";
import { nanoid } from "nanoid";
import { EventTemplate, NostrEvent, UnsignedEvent } from "nostr-tools";
import { PropsWithChildren, createContext, useCallback, useContext, useMemo, useState } from "react";
import { OkPacketAgainstEvent } from "rx-nostr";
import { BehaviorSubject } from "rxjs";

import { useWriteRelays } from "../../hooks/use-client-relays";
import { useUserOutbox } from "../../hooks/use-user-mailboxes";
import { getCacheRelay } from "../../services/cache-relay";
import { eventStore } from "../../services/event-store";
import rxNostr from "../../services/rx-nostr";
import { useSigningContext } from "./signing-provider";

export type PublishResults = { packets: OkPacketAgainstEvent[]; relays: Record<string, OkPacketAgainstEvent> };

export class PublishLogEntry extends BehaviorSubject<PublishResults> {
  public id = nanoid();

  public done = false;
  public packets: OkPacketAgainstEvent[] = [];
  public relay: Record<string, OkPacketAgainstEvent> = {};

  constructor(
    public label: string,
    public event: NostrEvent,
    public relays: string[],
  ) {
    super({ packets: [], relays: {} });

    const defaultWriteRelays = Array.from(Object.entries(rxNostr.getDefaultRelays()))
      .filter(([_, config]) => config.write)
      .map(([relay]) => relay);

    rxNostr.send(event, { on: { relays: mergeRelaySets(defaultWriteRelays, relays) } }).subscribe({
      next: (packet) => {
        if (packet.ok) {
          addSeenRelay(event, packet.from);
          eventStore.update(event);
        }

        this.packets.push(packet);
        this.relay[packet.from] = packet;

        this.next({ packets: this.packets, relays: this.relay });
      },
      complete: () => {
        this.done = true;
      },
    });
  }
}

type PublishContextType = {
  log: PublishLogEntry[];
  finalizeDraft(draft: EventTemplate | NostrEvent): Promise<UnsignedEvent>;
  publishEvent(
    label: string,
    event: EventTemplate | UnsignedEvent | NostrEvent,
    additionalRelays: Iterable<string> | undefined,
    quite: false,
    onlyAdditionalRelays: false,
  ): Promise<PublishLogEntry>;
  publishEvent(
    label: string,
    event: EventTemplate | UnsignedEvent | NostrEvent,
    additionalRelays: Iterable<string> | undefined,
    quite: false,
    onlyAdditionalRelays?: boolean,
  ): Promise<PublishLogEntry>;
  publishEvent(
    label: string,
    event: EventTemplate | UnsignedEvent | NostrEvent,
    additionalRelays?: Iterable<string> | undefined,
    quite?: boolean,
    onlyAdditionalRelays?: boolean,
  ): Promise<PublishLogEntry | undefined>;
};
export const PublishContext = createContext<PublishContextType>({
  log: [],
  finalizeDraft: () => {
    throw new Error("Publish provider not setup");
  },
  publishEvent: async () => {
    throw new Error("Publish provider not setup");
  },
});

export function usePublishEvent() {
  return useContext(PublishContext).publishEvent;
}
export function useFinalizeDraft() {
  return useContext(PublishContext).finalizeDraft;
}

export default function PublishProvider({ children }: PropsWithChildren) {
  const toast = useToast();
  const [log, setLog] = useState<PublishLogEntry[]>([]);
  const { requestSignature, finalizeDraft: signerFinalize } = useSigningContext();
  const account = useActiveAccount();
  const outBoxes = useUserOutbox(account?.pubkey);
  const writeRelays = useWriteRelays();

  const finalizeDraft = useCallback<PublishContextType["finalizeDraft"]>(
    (event: EventTemplate | NostrEvent) => signerFinalize(event),
    [signerFinalize],
  );

  const publishEvent = useCallback(
    async (
      label: string,
      event: EventTemplate | NostrEvent,
      additionalRelays?: string[],
      quite = true,
      onlyAdditionalRelays = false,
    ) => {
      try {
        let relays;
        if (onlyAdditionalRelays) {
          relays = mergeRelaySets(additionalRelays ?? []);
        } else {
          relays = mergeRelaySets(writeRelays, outBoxes, additionalRelays);
        }

        // add pubkey to event
        if (!Reflect.has(event, "pubkey")) event = await finalizeDraft(event);

        // sign event
        const signed = !Reflect.has(event, "sig") ? await requestSignature(event) : (event as NostrEvent);

        const entry = new PublishLogEntry(label, signed, [...relays]);

        setLog((arr) => arr.concat(entry));

        // send it to the local relay
        const cacheRelay = getCacheRelay();
        if (cacheRelay) cacheRelay.publish(signed);

        // add it to the event store
        eventStore.add(signed);

        return entry;
      } catch (e) {
        if (e instanceof Error) toast({ description: e.message, status: "error" });
        if (!quite) throw e;
      }
    },
    [toast, setLog, requestSignature, finalizeDraft, outBoxes, writeRelays],
  ) as PublishContextType["publishEvent"];

  const context = useMemo<PublishContextType>(
    () => ({
      publishEvent,
      finalizeDraft,
      log,
    }),
    [publishEvent, finalizeDraft, log],
  );

  return <PublishContext.Provider value={context}>{children}</PublishContext.Provider>;
}
