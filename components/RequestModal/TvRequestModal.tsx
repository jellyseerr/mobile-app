import Alert from '@/components/Common/Alert';
import Badge from '@/components/Common/Badge';
import Modal from '@/components/Common/Modal';
import ThemedText from '@/components/Common/ThemedText';
import type { RequestOverrides } from '@/components/RequestModal/AdvancedRequester';
import AdvancedRequester from '@/components/RequestModal/AdvancedRequester';
import QuotaDisplay from '@/components/RequestModal/QuotaDisplay';
import useServerUrl from '@/hooks/useServerUrl';
import useSettings from '@/hooks/useSettings';
import { useUser } from '@/hooks/useUser';
import { ANIME_KEYWORD_ID } from '@/jellyseerr/server/api/themoviedb/constants';
import {
  MediaRequestStatus,
  MediaStatus,
} from '@/jellyseerr/server/constants/media';
import type { MediaRequest } from '@/jellyseerr/server/entity/MediaRequest';
import type SeasonRequest from '@/jellyseerr/server/entity/SeasonRequest';
import type { NonFunctionProperties } from '@/jellyseerr/server/interfaces/api/common';
import type { QuotaResponse } from '@/jellyseerr/server/interfaces/api/userInterfaces';
import { Permission } from '@/jellyseerr/server/lib/permissions';
import type { TvDetails } from '@/jellyseerr/server/models/Tv';
import getJellyseerrMessages from '@/utils/getJellyseerrMessages';
import globalMessages from '@/utils/globalMessages';
import { toast } from '@backpackapp-io/react-native-toast';
import Checkbox from 'expo-checkbox';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { View } from 'react-native';
import useSWR, { mutate } from 'swr';

const messages = getJellyseerrMessages('components.RequestModal');

interface RequestModalProps extends React.HTMLAttributes<HTMLDivElement> {
  show: boolean;
  tmdbId: number;
  onCancel?: () => void;
  onComplete?: (newStatus: MediaStatus) => void;
  onUpdating?: (isUpdating: boolean) => void;
  is4k?: boolean;
  editRequest?: NonFunctionProperties<MediaRequest>;
}

const TvRequestModal = ({
  show,
  onCancel,
  onComplete,
  tmdbId,
  onUpdating,
  editRequest,
  is4k = false,
}: RequestModalProps) => {
  const serverUrl = useServerUrl();
  const settings = useSettings();
  const editingSeasons: number[] = (editRequest?.seasons ?? []).map(
    (season) => season.seasonNumber
  );
  const { data, error } = useSWR<TvDetails>(`${serverUrl}/api/v1/tv/${tmdbId}`);
  const [requestOverrides, setRequestOverrides] =
    useState<RequestOverrides | null>(null);
  const [selectedSeasons, setSelectedSeasons] = useState<number[]>(
    editRequest ? editingSeasons : []
  );
  const intl = useIntl();
  const { user, hasPermission } = useUser();
  const [searchModal, setSearchModal] = useState<{
    show: boolean;
  }>({
    show: true,
  });
  const [tvdbId, setTvdbId] = useState<number | undefined>(undefined);
  const { data: quota } = useSWR<QuotaResponse>(
    user &&
      (!requestOverrides?.user?.id || hasPermission(Permission.MANAGE_USERS))
      ? `${serverUrl}/api/v1/user/${requestOverrides?.user?.id ?? user.id}/quota`
      : null
  );

  const currentlyRemaining =
    (quota?.tv.remaining ?? 0) -
    selectedSeasons.length +
    (editRequest?.seasons ?? []).length;

  const updateRequest = async (alsoApproveRequest = false) => {
    if (!editRequest) {
      return;
    }

    if (onUpdating) {
      onUpdating(true);
    }

    try {
      if (selectedSeasons.length > 0) {
        const res = await fetch(
          `${serverUrl}/api/v1/request/${editRequest.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              mediaType: 'tv',
              serverId: requestOverrides?.server,
              profileId: requestOverrides?.profile,
              rootFolder: requestOverrides?.folder,
              languageProfileId: requestOverrides?.language,
              userId: requestOverrides?.user?.id,
              tags: requestOverrides?.tags,
              seasons: selectedSeasons,
            }),
          }
        );
        if (!res.ok) throw new Error();

        if (alsoApproveRequest) {
          const res = await fetch(
            `${serverUrl}/api/v1/request/${editRequest.id}/approve`,
            {
              method: 'POST',
            }
          );
          if (!res.ok) throw new Error();
        }
      } else {
        const res = await fetch(
          `${serverUrl}/api/v1/request/${editRequest.id}`,
          {
            method: 'DELETE',
          }
        );
        if (!res.ok) throw new Error();
      }
      mutate(
        `${serverUrl}/api/v1/request?filter=all&take=10&sort=modified&skip=0`
      );

      toast.success(
        <ThemedText>
          {selectedSeasons.length > 0
            ? intl.formatMessage(
                alsoApproveRequest
                  ? messages.requestApproved
                  : messages.requestedited,
                {
                  title: data?.name,
                  strong: (msg: React.ReactNode) => (
                    <ThemedText className="font-bold">{msg}</ThemedText>
                  ),
                }
              )
            : intl.formatMessage(messages.requestcancelled, {
                title: data?.name,
                strong: (msg: React.ReactNode) => (
                  <ThemedText className="font-bold">{msg}</ThemedText>
                ),
              })}
        </ThemedText>
      );
      if (onComplete) {
        onComplete(MediaStatus.PENDING);
      }
    } catch {
      toast.error(
        <ThemedText>{intl.formatMessage(messages.errorediting)}</ThemedText>
      );
    } finally {
      if (onUpdating) {
        onUpdating(false);
      }
    }
  };

  const sendRequest = async () => {
    if (
      settings.currentSettings.partialRequestsEnabled &&
      selectedSeasons.length === 0
    ) {
      return;
    }

    if (onUpdating) {
      onUpdating(true);
    }

    try {
      let overrideParams = {};
      if (requestOverrides) {
        overrideParams = {
          serverId: requestOverrides.server,
          profileId: requestOverrides.profile,
          rootFolder: requestOverrides.folder,
          languageProfileId: requestOverrides.language,
          userId: requestOverrides?.user?.id,
          tags: requestOverrides.tags,
        };
      }
      const res = await fetch(`${serverUrl}/api/v1/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaId: data?.id,
          tvdbId: tvdbId ?? data?.externalIds.tvdbId,
          mediaType: 'tv',
          is4k,
          seasons: settings.currentSettings.partialRequestsEnabled
            ? selectedSeasons
            : getAllSeasons().filter(
                (season) => !getAllRequestedSeasons().includes(season)
              ),
          ...overrideParams,
        }),
      });
      if (!res.ok) throw new Error();
      const mediaRequest: MediaRequest = await res.json();

      mutate(
        `${serverUrl}/api/v1/request?filter=all&take=10&sort=modified&skip=0`
      );

      if (mediaRequest) {
        if (onComplete) {
          onComplete(mediaRequest.media.status);
        }
        toast.success(
          <ThemedText>
            {intl.formatMessage(messages.requestSuccess, {
              title: data?.name,
              strong: (msg: React.ReactNode) => (
                <ThemedText className="font-bold">{msg}</ThemedText>
              ),
            })}
          </ThemedText>
        );
      }
    } catch (e) {
      toast.error(intl.formatMessage(messages.requesterror));
    } finally {
      if (onUpdating) {
        onUpdating(false);
      }
    }
  };

  const getAllSeasons = (): number[] => {
    let allSeasons = (data?.seasons ?? []).filter(
      (season) => season.episodeCount !== 0
    );
    if (!settings.currentSettings.enableSpecialEpisodes) {
      allSeasons = allSeasons.filter((season) => season.seasonNumber !== 0);
    }
    return allSeasons.map((season) => season.seasonNumber);
  };

  const getAllRequestedSeasons = (): number[] => {
    const requestedSeasons = (data?.mediaInfo?.requests ?? [])
      .filter(
        (request) =>
          request.is4k === is4k &&
          request.status !== MediaRequestStatus.DECLINED
      )
      .reduce((requestedSeasons, request) => {
        return [
          ...requestedSeasons,
          ...request.seasons
            .filter((season) => !editingSeasons.includes(season.seasonNumber))
            .map((sr) => sr.seasonNumber),
        ];
      }, [] as number[]);

    const availableSeasons = (data?.mediaInfo?.seasons ?? [])
      .filter(
        (season) =>
          (season[is4k ? 'status4k' : 'status'] === MediaStatus.AVAILABLE ||
            season[is4k ? 'status4k' : 'status'] ===
              MediaStatus.PARTIALLY_AVAILABLE ||
            season[is4k ? 'status4k' : 'status'] === MediaStatus.PROCESSING) &&
          !requestedSeasons.includes(season.seasonNumber)
      )
      .map((season) => season.seasonNumber);

    return [...requestedSeasons, ...availableSeasons];
  };

  const isSelectedSeason = (seasonNumber: number): boolean =>
    selectedSeasons.includes(seasonNumber);

  const toggleSeason = (seasonNumber: number): void => {
    // If this season already has a pending request, don't allow it to be toggled
    if (getAllRequestedSeasons().includes(seasonNumber)) {
      return;
    }

    // If there are no more remaining requests available, block toggle
    if (
      quota?.tv.limit &&
      currentlyRemaining <= 0 &&
      !isSelectedSeason(seasonNumber)
    ) {
      return;
    }

    if (selectedSeasons.includes(seasonNumber)) {
      setSelectedSeasons((seasons) =>
        seasons.filter((sn) => sn !== seasonNumber)
      );
    } else {
      setSelectedSeasons((seasons) => [...seasons, seasonNumber]);
    }
  };

  const unrequestedSeasons = getAllSeasons().filter(
    (season) => !getAllRequestedSeasons().includes(season)
  );

  const toggleAllSeasons = (): void => {
    // If the user has a quota and not enough requests for all seasons, block toggleAllSeasons
    if (
      quota?.tv.limit &&
      (quota?.tv.remaining ?? 0) < unrequestedSeasons.length
    ) {
      return;
    }

    if (
      data &&
      selectedSeasons.length >= 0 &&
      selectedSeasons.length < unrequestedSeasons.length
    ) {
      setSelectedSeasons(unrequestedSeasons);
    } else {
      setSelectedSeasons([]);
    }
  };

  const isAllSeasons = (): boolean => {
    if (!data) {
      return false;
    }
    return (
      selectedSeasons.length ===
      getAllSeasons().filter(
        (season) => !getAllRequestedSeasons().includes(season)
      ).length
    );
  };

  const getSeasonRequest = (
    seasonNumber: number
  ): SeasonRequest | undefined => {
    let seasonRequest: SeasonRequest | undefined;

    if (
      data?.mediaInfo &&
      (data.mediaInfo.requests || []).filter(
        (request) =>
          request.is4k === is4k &&
          request.status !== MediaRequestStatus.DECLINED
      ).length > 0
    ) {
      data.mediaInfo.requests
        .filter((request) => request.is4k === is4k)
        .forEach((request) => {
          if (!seasonRequest) {
            seasonRequest = request.seasons.find(
              (season) => season.seasonNumber === seasonNumber
            );
          }
        });
    }

    return seasonRequest;
  };

  const isOwner = editRequest && editRequest.requestedBy.id === user?.id;

  return data &&
    !error &&
    !data.externalIds.tvdbId &&
    searchModal.show ? //   setTvdbId={setTvdbId} //   tvdbId={tvdbId} // <SearchByNameModal
  //   closeModal={() => setSearchModal({ show: false })}
  //   onCancel={onCancel}
  //   modalTitle={intl.formatMessage(
  //     is4k ? messages.requestseries4ktitle : messages.requestseriestitle
  //   )}
  //   modalSubTitle={data.name}
  //   tmdbId={tmdbId}
  //   backdrop={`https://image.tmdb.org/t/p/w1920_and_h800_multi_faces/${data?.backdropPath}`}
  // />
  null : (
    <Modal
      show={show}
      loading={!data && !error}
      backgroundClickable
      onCancel={tvdbId ? () => setSearchModal({ show: true }) : onCancel}
      onOk={() =>
        editRequest
          ? hasPermission(Permission.MANAGE_REQUESTS)
            ? updateRequest(true)
            : updateRequest()
          : sendRequest()
      }
      title={intl.formatMessage(
        editRequest
          ? is4k
            ? messages.pending4krequest
            : messages.pendingrequest
          : is4k
            ? messages.requestseries4ktitle
            : messages.requestseriestitle
      )}
      subTitle={data?.name}
      okText={
        editRequest
          ? selectedSeasons.length === 0
            ? intl.formatMessage(messages.cancel)
            : hasPermission(Permission.MANAGE_REQUESTS)
              ? intl.formatMessage(messages.approve)
              : intl.formatMessage(messages.edit)
          : getAllRequestedSeasons().length >= getAllSeasons().length
            ? intl.formatMessage(messages.alreadyrequested)
            : !settings.currentSettings.partialRequestsEnabled
              ? intl.formatMessage(
                  is4k ? globalMessages.request4k : globalMessages.request
                )
              : selectedSeasons.length === 0
                ? intl.formatMessage(messages.selectseason)
                : intl.formatMessage(
                    is4k ? messages.requestseasons4k : messages.requestseasons,
                    {
                      seasonCount: selectedSeasons.length,
                    }
                  )
      }
      okDisabled={
        editRequest
          ? false
          : !settings.currentSettings.partialRequestsEnabled &&
              quota?.tv.limit &&
              unrequestedSeasons.length > quota.tv.limit
            ? true
            : getAllRequestedSeasons().length >= getAllSeasons().length ||
              (settings.currentSettings.partialRequestsEnabled &&
                selectedSeasons.length === 0)
      }
      okButtonType={
        editRequest
          ? settings.currentSettings.partialRequestsEnabled &&
            selectedSeasons.length === 0
            ? 'danger'
            : hasPermission(Permission.MANAGE_REQUESTS)
              ? 'success'
              : 'primary'
          : 'primary'
      }
      cancelText={
        editRequest
          ? intl.formatMessage(globalMessages.close)
          : tvdbId
            ? intl.formatMessage(globalMessages.back)
            : intl.formatMessage(globalMessages.cancel)
      }
      backdrop={`https://image.tmdb.org/t/p/w1920_and_h800_multi_faces/${data?.backdropPath}`}
    >
      {editRequest
        ? isOwner
          ? intl.formatMessage(messages.pendingapproval)
          : intl.formatMessage(messages.requestfrom, {
              username: editRequest?.requestedBy.displayName,
            })
        : null}
      {hasPermission(
        [
          Permission.MANAGE_REQUESTS,
          is4k ? Permission.AUTO_APPROVE_4K : Permission.AUTO_APPROVE,
          is4k ? Permission.AUTO_APPROVE_4K_TV : Permission.AUTO_APPROVE_TV,
        ],
        { type: 'or' }
      ) &&
        !(
          quota?.tv.limit &&
          !settings.currentSettings.partialRequestsEnabled &&
          unrequestedSeasons.length > (quota?.tv.remaining ?? 0)
        ) &&
        getAllRequestedSeasons().length < getAllSeasons().length &&
        !editRequest && (
          <ThemedText className="mt-2">
            <Alert
              title={intl.formatMessage(messages.requestadmin)}
              type="info"
            />
          </ThemedText>
        )}
      {(quota?.tv.limit ?? 0) > 0 && (
        <QuotaDisplay
          mediaType="tv"
          quota={quota?.tv}
          remaining={
            !settings.currentSettings.partialRequestsEnabled &&
            unrequestedSeasons.length > (quota?.tv.remaining ?? 0)
              ? 0
              : currentlyRemaining
          }
          userOverride={
            requestOverrides?.user && requestOverrides.user.id !== user?.id
              ? requestOverrides?.user?.id
              : undefined
          }
          overLimit={
            !settings.currentSettings.partialRequestsEnabled &&
            unrequestedSeasons.length > (quota?.tv.remaining ?? 0)
              ? unrequestedSeasons.length
              : undefined
          }
        />
      )}
      <View className="mt-4 flex flex-col">
        <View className="-mx-4 sm:mx-0">
          <View className="inline-block min-w-full py-2 align-middle">
            <View className="overflow-hidden border border-gray-700 sm:rounded-lg">
              <View className="min-w-full">
                <View className="flex flex-row">
                  <View
                    className={`w-16 bg-gray-700/80 px-4 py-3 ${
                      !settings.currentSettings.partialRequestsEnabled &&
                      'hidden'
                    }`}
                  >
                    {/* <ThemedText
                      role="checkbox"
                      tabIndex={0}
                      aria-checked={isAllSeasons()}
                      onClick={() => toggleAllSeasons()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Space') {
                          toggleAllSeasons();
                        }
                      }}
                      className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer items-center justify-center pt-2 focus:outline-none ${
                        quota?.tv.remaining &&
                        quota.tv.limit &&
                        quota.tv.remaining < unrequestedSeasons.length
                          ? 'opacity-50'
                          : ''
                      }`}
                    >
                      <ThemedText
                        aria-hidden="true"
                        className={`${
                          isAllSeasons() ? 'bg-indigo-500' : 'bg-gray-800'
                        } absolute mx-auto h-4 w-9 rounded-full transition-colors duration-200 ease-in-out`}
                      ></ThemedText>
                      <ThemedText
                        aria-hidden="true"
                        className={`${
                          isAllSeasons() ? 'translate-x-5' : 'translate-x-0'
                        } absolute left-0 inline-block h-5 w-5 rounded-full border border-gray-200 bg-white shadow transition-transform duration-200 ease-in-out group-focus:border-blue-300 group-focus:ring`}
                      ></ThemedText>
                    </ThemedText> */}
                    <Checkbox
                      value={isAllSeasons()}
                      onValueChange={() => toggleAllSeasons()}
                      color={isAllSeasons() ? '#6366f1' : '#e5e7eb'}
                    />
                  </View>
                  <ThemedText className="flex-1 bg-gray-700/80 px-1 py-4 text-left text-sm font-medium uppercase leading-4 tracking-wider text-gray-200 md:px-6">
                    {intl.formatMessage(messages.season)}
                  </ThemedText>
                  <ThemedText className="flex-1 bg-gray-700/80 px-5 py-4 text-left text-sm font-medium uppercase leading-4 tracking-wider text-gray-200 md:px-6">
                    {intl.formatMessage(messages.numberofepisodes)}
                  </ThemedText>
                  <ThemedText className="flex-1 bg-gray-700/80 px-2 py-4 text-left text-sm font-medium uppercase leading-4 tracking-wider text-gray-200 md:px-6">
                    {intl.formatMessage(globalMessages.status)}
                  </ThemedText>
                </View>
                <View className="divide-y divide-gray-700">
                  {data?.seasons
                    .filter(
                      (season) =>
                        (!settings.currentSettings.enableSpecialEpisodes
                          ? season.seasonNumber !== 0
                          : true) && season.episodeCount !== 0
                    )
                    .map((season) => {
                      const seasonRequest = getSeasonRequest(
                        season.seasonNumber
                      );
                      const mediaSeason = data?.mediaInfo?.seasons.find(
                        (sn) =>
                          sn.seasonNumber === season.seasonNumber &&
                          sn[is4k ? 'status4k' : 'status'] !==
                            MediaStatus.UNKNOWN
                      );
                      return (
                        <View
                          key={`season-${season.id}`}
                          className="flex flex-row"
                        >
                          <View
                            className={`w-16 px-4 py-3 ${
                              !settings.currentSettings
                                .partialRequestsEnabled && 'hidden'
                            }`}
                          >
                            {/* <ThemedText
                              role="checkbox"
                              tabIndex={0}
                              aria-checked={
                                !!mediaSeason ||
                                (!!seasonRequest &&
                                  !editingSeasons.includes(
                                    season.seasonNumber
                                  )) ||
                                isSelectedSeason(season.seasonNumber)
                              }
                              onClick={() => toggleSeason(season.seasonNumber)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Space') {
                                  toggleSeason(season.seasonNumber);
                                }
                              }}
                              className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer items-center justify-center pt-2 focus:outline-none ${
                                mediaSeason ||
                                (quota?.tv.limit &&
                                  currentlyRemaining <= 0 &&
                                  !isSelectedSeason(season.seasonNumber)) ||
                                (!!seasonRequest &&
                                  !editingSeasons.includes(season.seasonNumber))
                                  ? 'opacity-50'
                                  : ''
                              }`}
                            >
                              <ThemedText
                                aria-hidden="true"
                                className={`${
                                  !!mediaSeason ||
                                  (!!seasonRequest &&
                                    !editingSeasons.includes(
                                      season.seasonNumber
                                    )) ||
                                  isSelectedSeason(season.seasonNumber)
                                    ? 'bg-indigo-500'
                                    : 'bg-gray-700'
                                } absolute mx-auto h-4 w-9 rounded-full transition-colors duration-200 ease-in-out`}
                              ></ThemedText>
                              <ThemedText
                                aria-hidden="true"
                                className={`${
                                  !!mediaSeason ||
                                  (!!seasonRequest &&
                                    !editingSeasons.includes(
                                      season.seasonNumber
                                    )) ||
                                  isSelectedSeason(season.seasonNumber)
                                    ? 'translate-x-5'
                                    : 'translate-x-0'
                                } absolute left-0 inline-block h-5 w-5 rounded-full border border-gray-200 bg-white shadow transition-transform duration-200 ease-in-out group-focus:border-blue-300 group-focus:ring`}
                              ></ThemedText>
                            </ThemedText> */}
                            <Checkbox
                              value={
                                !!mediaSeason ||
                                (!!seasonRequest &&
                                  !editingSeasons.includes(
                                    season.seasonNumber
                                  )) ||
                                isSelectedSeason(season.seasonNumber)
                              }
                              onValueChange={() =>
                                toggleSeason(season.seasonNumber)
                              }
                              color={
                                !!mediaSeason ||
                                (!!seasonRequest &&
                                  !editingSeasons.includes(
                                    season.seasonNumber
                                  )) ||
                                isSelectedSeason(season.seasonNumber)
                                  ? '#6366f1'
                                  : '#e5e7eb'
                              }
                            />
                          </View>
                          <ThemedText className="flex-1 whitespace-nowrap px-1 py-4 text-sm font-medium leading-5 text-gray-100 md:px-6">
                            {season.seasonNumber === 0
                              ? intl.formatMessage(globalMessages.specials)
                              : intl.formatMessage(messages.seasonnumber, {
                                  number: season.seasonNumber,
                                })}
                          </ThemedText>
                          <ThemedText className="flex-1 whitespace-nowrap px-5 py-4 text-sm leading-5 text-gray-200 md:px-6">
                            {season.episodeCount}
                          </ThemedText>
                          <View className="flex-1 whitespace-nowrap px-2 py-4 text-sm leading-5 text-gray-200 md:px-6">
                            <View className="flex flex-row justify-start">
                              {!seasonRequest && !mediaSeason && (
                                <Badge>
                                  {intl.formatMessage(
                                    globalMessages.notrequested
                                  )}
                                </Badge>
                              )}
                              {!mediaSeason &&
                                seasonRequest?.status ===
                                  MediaRequestStatus.PENDING && (
                                  <Badge badgeType="warning">
                                    {intl.formatMessage(globalMessages.pending)}
                                  </Badge>
                                )}
                              {((!mediaSeason &&
                                seasonRequest?.status ===
                                  MediaRequestStatus.APPROVED) ||
                                mediaSeason?.[is4k ? 'status4k' : 'status'] ===
                                  MediaStatus.PROCESSING) && (
                                <Badge badgeType="primary">
                                  {intl.formatMessage(globalMessages.requested)}
                                </Badge>
                              )}
                              {mediaSeason?.[is4k ? 'status4k' : 'status'] ===
                                MediaStatus.PARTIALLY_AVAILABLE && (
                                <Badge badgeType="success">
                                  {intl.formatMessage(
                                    globalMessages.partiallyavailable
                                  )}
                                </Badge>
                              )}
                              {mediaSeason?.[is4k ? 'status4k' : 'status'] ===
                                MediaStatus.AVAILABLE && (
                                <Badge badgeType="success">
                                  {intl.formatMessage(globalMessages.available)}
                                </Badge>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
      {(hasPermission(Permission.REQUEST_ADVANCED) ||
        hasPermission(Permission.MANAGE_REQUESTS)) && (
        <AdvancedRequester
          type="tv"
          is4k={is4k}
          isAnime={data?.keywords.some(
            (keyword) => keyword.id === ANIME_KEYWORD_ID
          )}
          onChange={(overrides) => setRequestOverrides(overrides)}
          requestUser={editRequest?.requestedBy}
          defaultOverrides={
            editRequest
              ? {
                  folder: editRequest.rootFolder,
                  profile: editRequest.profileId,
                  server: editRequest.serverId,
                  language: editRequest.languageProfileId,
                  tags: editRequest.tags,
                }
              : undefined
          }
        />
      )}
    </Modal>
  );
};

export default TvRequestModal;
