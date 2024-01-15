import _throttle from "lodash.throttle";

import NostrRequest from "../classes/nostr-request";
import Subject from "../classes/subject";
import SuperMap from "../classes/super-map";
import { NostrEvent } from "../types/nostr-event";
import { localCacheRelay } from "./local-cache-relay";
import { relayRequest, safeRelayUrls } from "../helpers/relay";
import { logger } from "../helpers/debug";

const RELAY_REQUEST_BATCH_TIME = 500;

class SingleEventService {
  private cache = new SuperMap<string, Subject<NostrEvent>>(() => new Subject());
  pending = new Map<string, string[]>();
  log = logger.extend("SingleEvent");

  requestEvent(id: string, relays: string[]) {
    const subject = this.cache.get(id);
    if (subject.value) return subject;

    relays = safeRelayUrls(relays);
    this.pending.set(id, this.pending.get(id)?.concat(relays) ?? relays);
    this.batchRequestsThrottle();

    return subject;
  }

  handleEvent(event: NostrEvent, cache = true) {
    this.cache.get(event.id).next(event);

    if (cache) localCacheRelay.publish(event);
  }

  private batchRequestsThrottle = _throttle(this.batchRequests, RELAY_REQUEST_BATCH_TIME);
  async batchRequests() {
    if (this.pending.size === 0) return;

    const ids = Array.from(this.pending.keys());
    const loaded: string[] = [];

    // load from cache relay
    const fromCache = await relayRequest(localCacheRelay, [{ ids }]);

    for (const e of fromCache) {
      this.handleEvent(e, false);
      loaded.push(e.id);
    }

    if (loaded.length > 0) this.log(`Loaded ${loaded.length} from cache instead of relays`);

    const idsFromRelays: Record<string, string[]> = {};
    for (const [id, relays] of this.pending) {
      if (loaded.includes(id)) continue;

      for (const relay of relays) {
        idsFromRelays[relay] = idsFromRelays[relay] ?? [];
        idsFromRelays[relay].push(id);
      }
    }

    for (const [relay, ids] of Object.entries(idsFromRelays)) {
      const request = new NostrRequest([relay]);
      request.onEvent.subscribe(this.handleEvent, this);
      request.start({ ids });
    }
    this.pending.clear();
  }
}

const singleEventService = new SingleEventService();

export default singleEventService;
