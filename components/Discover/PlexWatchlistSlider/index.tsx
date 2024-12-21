import ThemedText from '@/components/Common/ThemedText';
import Slider from '@/components/Slider';
import TmdbTitleCard from '@/components/TitleCard/TmdbTitleCard';
import { useUser } from '@/hooks/useUser';
import type { WatchlistItem } from '@/jellyseerr/server/interfaces/api/discoverInterfaces';
import type { RootState } from '@/store';
import getJellyseerrMessages from '@/utils/getJellyseerrMessages';
import { ArrowRightCircle } from '@nandorojo/heroicons/24/outline';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { Linking, Pressable, View } from 'react-native';
import { useSelector } from 'react-redux';

const messages = getJellyseerrMessages(
  'components.Discover.PlexWatchlistSlider'
);

const PlexWatchlistSlider = () => {
  const intl = useIntl();
  const serverUrl = useSelector(
    (state: RootState) => state.appSettings.serverUrl
  );
  const { user } = useUser();

  const [watchlistItems, setWatchlistItems] = useState<{
    page: number;
    totalPages: number;
    totalResults: number;
    results: WatchlistItem[];
  } | null>(null);
  const [watchlistError, setWatchlistError] = useState<Error | null>(null);

  async function fetchWatchlistItems() {
    try {
      const response = await fetch(serverUrl + '/api/v1/discover/watchlist');
      if (!response.ok) {
        throw new Error('Failed to fetch watchlist items');
      }
      const data = await response.json();
      setWatchlistItems(data);
    } catch (error) {
      setWatchlistError(error as Error);
    }
  }

  useEffect(() => {
    fetchWatchlistItems();
  }, []);

  if (
    (watchlistItems &&
      watchlistItems.results.length === 0 &&
      !user?.settings?.watchlistSyncMovies &&
      !user?.settings?.watchlistSyncTv) ||
    watchlistError
  ) {
    return null;
  }

  return (
    <>
      <View className="slider-header px-4">
        <Link href={'/discover/watchlist' as any} className="slider-title">
          <Pressable>
            <View className="flex min-w-0 flex-row items-center gap-2 pr-16">
              <ThemedText className="truncate text-2xl font-bold">
                {intl.formatMessage(messages.plexwatchlist)}
              </ThemedText>
              <ArrowRightCircle color="#ffffff" />
            </View>
          </Pressable>
        </Link>
      </View>
      <Slider
        sliderKey="watchlist"
        isLoading={!watchlistItems}
        isEmpty={!!watchlistItems && watchlistItems.results.length === 0}
        emptyMessage={intl.formatMessage(messages.emptywatchlist, {
          PlexWatchlistSupportLink: (msg: React.ReactNode) => (
            <Pressable
              onPress={() => {
                Linking.openURL(
                  'https://support.plex.tv/articles/universal-watchlist/'
                );
              }}
            >
              <ThemedText className="text-white transition duration-300 hover:underline">
                {msg}
              </ThemedText>
            </Pressable>
          ),
        })}
        items={watchlistItems?.results.map((item) => (
          <TmdbTitleCard
            id={item.tmdbId}
            key={`watchlist-slider-item-${item.ratingKey}`}
            tmdbId={item.tmdbId}
            type={item.mediaType}
            isAddedToWatchlist={true}
          />
        ))}
      />
    </>
  );
};

export default PlexWatchlistSlider;
