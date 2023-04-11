import {
  Flex,
  FormControl,
  FormLabel,
  Switch,
  AccordionItem,
  AccordionPanel,
  AccordionButton,
  Box,
  AccordionIcon,
  FormHelperText,
} from "@chakra-ui/react";
import settings from "../../services/settings";
import useSubject from "../../hooks/use-subject";

export default function PerformanceSettings() {
  const autoShowMedia = useSubject(settings.autoShowMedia);
  const proxyUserMedia = useSubject(settings.proxyUserMedia);
  const showReactions = useSubject(settings.showReactions);
  const showSignatureVerification = useSubject(settings.showSignatureVerification);

  return (
    <AccordionItem>
      <h2>
        <AccordionButton>
          <Box as="span" flex="1" textAlign="left">
            Performance
          </Box>
          <AccordionIcon />
        </AccordionButton>
      </h2>
      <AccordionPanel>
        <Flex direction="column" gap="4">
          <FormControl>
            <Flex alignItems="center">
              <FormLabel htmlFor="proxy-user-media" mb="0">
                Proxy user media
              </FormLabel>
              <Switch
                id="proxy-user-media"
                isChecked={proxyUserMedia}
                onChange={(v) => settings.proxyUserMedia.next(v.target.checked)}
              />
            </Flex>
            <FormHelperText>
              <span>Enabled: Use media.nostr.band to get smaller profile pictures (saves ~50Mb of data)</span>
              <br />
              <span>Side Effect: Some user pictures may not load or may be outdated</span>
            </FormHelperText>
          </FormControl>
          <FormControl>
            <Flex alignItems="center">
              <FormLabel htmlFor="auto-show-embeds" mb="0">
                Automatically show media
              </FormLabel>
              <Switch
                id="auto-show-embeds"
                isChecked={autoShowMedia}
                onChange={(v) => settings.autoShowMedia.next(v.target.checked)}
              />
            </Flex>
            <FormHelperText>Disabled: Images and videos will show expandable buttons</FormHelperText>
          </FormControl>
          <FormControl>
            <Flex alignItems="center">
              <FormLabel htmlFor="show-reactions" mb="0">
                Show reactions
              </FormLabel>
              <Switch
                id="show-reactions"
                isChecked={showReactions}
                onChange={(v) => settings.showReactions.next(v.target.checked)}
              />
            </Flex>
            <FormHelperText>Enabled: Show reactions on notes</FormHelperText>
          </FormControl>
          <FormControl>
            <Flex alignItems="center">
              <FormLabel htmlFor="show-sig-verify" mb="0">
                Show signature verification
              </FormLabel>
              <Switch
                id="show-sig-verify"
                isChecked={showSignatureVerification}
                onChange={(v) => settings.showSignatureVerification.next(v.target.checked)}
              />
            </Flex>
            <FormHelperText>Enabled: show signature verification on notes</FormHelperText>
          </FormControl>
        </Flex>
      </AccordionPanel>
    </AccordionItem>
  );
}