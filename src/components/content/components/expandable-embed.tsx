import { PropsWithChildren, ReactNode } from "react";
import EmbedActions from "./embed-actions";
import { Link, useDisclosure } from "@chakra-ui/react";

import useAppSettings from "../../../hooks/use-user-app-settings";
import OpenGraphCard from "../../open-graph/open-graph-card";

export default function ExpandableEmbed({
  children,
  label,
  url,
  raw,
  hideOnDefaultOpen,
  actions,
  card,
}: PropsWithChildren<{
  label: string;
  url?: string | URL;
  hideOnDefaultOpen?: boolean;
  actions?: ReactNode;
  raw?: ReactNode;
  card?: boolean;
}>) {
  const { autoShowMedia } = useAppSettings();
  const expanded = useDisclosure({ defaultIsOpen: autoShowMedia });
  const showActions = hideOnDefaultOpen && autoShowMedia ? false : true;

  return (
    <>
      {showActions && (
        <EmbedActions
          open={expanded.isOpen}
          onToggle={expanded.onToggle}
          url={url}
          label={label}
          display="flex"
          mt="2"
          mb="1"
        >
          {actions}
        </EmbedActions>
      )}
      {expanded.isOpen
        ? children
        : raw ||
          (url &&
            (card ? (
              <OpenGraphCard url={new URL(url)} />
            ) : (
              <Link color="blue.500" href={url.toString()} isExternal>
                {url.toString()}
              </Link>
            )))}
    </>
  );
}
