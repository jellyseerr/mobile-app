import useSettings from '@/hooks/useSettings';
import { MediaServerType } from '@/jellyseerr/server/constants/server';
import { useEffect, useState } from 'react';

interface useDeepLinksProps {
  mediaUrl?: string;
  mediaUrl4k?: string;
  iOSPlexUrl?: string;
  iOSPlexUrl4k?: string;
}

const useDeepLinks = ({
  mediaUrl,
  mediaUrl4k,
  iOSPlexUrl,
  iOSPlexUrl4k,
}: useDeepLinksProps) => {
  const [returnedMediaUrl, setReturnedMediaUrl] = useState(mediaUrl);
  const [returnedMediaUrl4k, setReturnedMediaUrl4k] = useState(mediaUrl4k);
  const settings = useSettings();

  useEffect(() => {
    if (settings.currentSettings.mediaServerType === MediaServerType.PLEX) {
      setReturnedMediaUrl(iOSPlexUrl);
      setReturnedMediaUrl4k(iOSPlexUrl4k);
    } else {
      setReturnedMediaUrl(mediaUrl);
      setReturnedMediaUrl4k(mediaUrl4k);
    }
  }, [
    iOSPlexUrl,
    iOSPlexUrl4k,
    mediaUrl,
    mediaUrl4k,
    settings.currentSettings.mediaServerType,
  ]);

  return { mediaUrl: returnedMediaUrl, mediaUrl4k: returnedMediaUrl4k };
};

export default useDeepLinks;
