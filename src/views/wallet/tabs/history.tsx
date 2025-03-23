import {
  AvatarGroup,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  IconButton,
  Spacer,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { useActiveAccount, useEventStore, useStoreQuery } from "applesauce-react/hooks";
import {
  getHistoryContent,
  getHistoryRedeemed,
  isHistoryContentLocked,
  unlockHistoryContent,
} from "applesauce-wallet/helpers";
import { WalletHistoryQuery } from "applesauce-wallet/queries";
import { NostrEvent } from "nostr-tools";

import Lock01 from "../../../components/icons/lock-01";
import DebugEventButton from "../../../components/debug-modal/debug-event-button";
import ArrowBlockUp from "../../../components/icons/arrow-block-up";
import ArrowBlockDown from "../../../components/icons/arrow-block-down";
import useEventIntersectionRef from "../../../hooks/use-event-intersection-ref";
import useAsyncAction from "../../../hooks/use-async-error-handler";
import { useDeleteEventContext } from "../../../providers/route/delete-event-provider";
import { ChevronDownIcon, ChevronUpIcon, TrashIcon } from "../../../components/icons";
import useEventUpdate from "../../../hooks/use-event-update";
import Timestamp from "../../../components/timestamp";
import useSingleEvents from "../../../hooks/use-single-events";
import UserAvatarLink from "../../../components/user/user-avatar-link";
import CashuMintFavicon from "../../../components/cashu/cashu-mint-favicon";
import CashuMintName from "../../../components/cashu/cashu-mint-name";
import { usePublishEvent } from "../../../providers/global/publish-provider";
import factory from "../../../services/event-factory";

function HistoryEntry({ entry }: { entry: NostrEvent }) {
  const more = useDisclosure();
  const account = useActiveAccount()!;
  const eventStore = useEventStore();
  const locked = isHistoryContentLocked(entry);
  const details = !locked ? getHistoryContent(entry) : undefined;
  useEventUpdate(entry.id);

  const ref = useEventIntersectionRef(entry);
  const { deleteEvent } = useDeleteEventContext();

  const redeemedIds = getHistoryRedeemed(entry);
  const redeemed = useSingleEvents(redeemedIds);

  const { run: unlock } = useAsyncAction(async () => {
    await unlockHistoryContent(entry, account);
    eventStore.update(entry);
  }, [entry, account, eventStore]);

  return (
    <Card ref={ref}>
      <CardHeader p="2" display="flex" flexDirection="row" gap="2" alignItems="center">
        {locked ? (
          <Lock01 boxSize={8} />
        ) : details?.direction === "in" ? (
          <ArrowBlockDown boxSize={8} color="green.500" />
        ) : (
          <ArrowBlockUp boxSize={8} color="orange.500" />
        )}
        <Text fontSize="xl">{details?.amount}</Text>
        {details?.fee !== undefined && <Text>( fee {details.fee} )</Text>}
        <Spacer />
        <ButtonGroup size="sm" alignItems="center">
          {locked && (
            <Button onClick={unlock} variant="link" p="2">
              Unlock
            </Button>
          )}
          <Timestamp timestamp={entry.created_at} />
        </ButtonGroup>
      </CardHeader>
      {details && (
        <CardBody px="2" pt="0" pb="2" display="flex">
          {details.mint && (
            <>
              <CashuMintFavicon mint={details.mint} size="xs" mr="2" />
              <CashuMintName mint={details.mint} />
            </>
          )}
          {redeemed.length > 0 && (
            <>
              <Text mr="2">Redeemed zaps from:</Text>
              <AvatarGroup size="sm">
                {redeemed.map((event) => (
                  <UserAvatarLink key={event.id} pubkey={event.pubkey} />
                ))}
              </AvatarGroup>
            </>
          )}

          <Button
            ms="auto"
            size="sm"
            variant="link"
            onClick={more.onToggle}
            rightIcon={more.isOpen ? <ChevronUpIcon boxSize={6} /> : <ChevronDownIcon boxSize={6} />}
          >
            Details
          </Button>
        </CardBody>
      )}
      {more.isOpen && (
        <CardFooter pt="0" pb="2" px="2" gap="2" display="flex">
          <ButtonGroup size="sm" ms="auto">
            <DebugEventButton variant="ghost" event={entry} />
            <IconButton
              icon={<TrashIcon boxSize={5} />}
              aria-label="Delete entry"
              onClick={() => deleteEvent(entry)}
              colorScheme="red"
              variant="ghost"
            />
          </ButtonGroup>
        </CardFooter>
      )}
    </Card>
  );
}

export default function WalletHistoryTab() {
  const account = useActiveAccount()!;
  const eventStore = useEventStore();
  const publish = usePublishEvent();

  const history = useStoreQuery(WalletHistoryQuery, [account.pubkey]) ?? [];
  const locked = useStoreQuery(WalletHistoryQuery, [account.pubkey, true]) ?? [];

  const { run: unlock } = useAsyncAction(async () => {
    for (const entry of locked) {
      if (!isHistoryContentLocked(entry)) continue;
      await unlockHistoryContent(entry, account);
      eventStore.update(entry);
    }
  }, [locked, account, eventStore]);

  const clear = useAsyncAction(async () => {
    if (confirm("Are you sure you want to clear history?") !== true) return;
    const draft = await factory.delete(history);
    await publish("Clear history", draft);
  }, [factory, publish, history]);

  return (
    <Flex direction="column" gap="2" w="full">
      <ButtonGroup variant="link">
        <Button onClick={clear.run} isLoading={clear.loading} isDisabled={history.length === 0}>
          Clear History
        </Button>
        <Spacer />
        <Button onClick={unlock} isDisabled={!locked || locked.length === 0}>
          Unlock all ({locked?.length})
        </Button>
      </ButtonGroup>
      {history?.map((entry) => <HistoryEntry key={entry.id} entry={entry} />)}
    </Flex>
  );
}
