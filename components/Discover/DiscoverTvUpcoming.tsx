import Header from '@app/components/Common/Header';
import ListView from '@app/components/Common/ListView';
import PageTitle from '@app/components/Common/PageTitle';
import useDiscover from '@app/hooks/useDiscover';
import Error from '@app/pages/_error';
import defineMessages from '@app/utils/defineMessages';
import type { TvResult } from '@server/models/Search';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.DiscoverTvUpcoming', {});

const DiscoverTvUpcoming = () => {
  const intl = useIntl();

  const {
    isLoadingInitialData,
    isEmpty,
    isLoadingMore,
    isReachingEnd,
    titles,
    fetchMore,
    error,
  } = useDiscover<TvResult>('/api/v1/discover/tv/upcoming');

  if (error) {
    return <Error statusCode={500} />;
  }

  return (
    <>
      <PageTitle title={intl.formatMessage(messages.upcomingtv)} />
      <div className="mb-5 mt-1">
        <Header>{intl.formatMessage(messages.upcomingtv)}</Header>
      </div>
      <ListView
        items={titles}
        isEmpty={isEmpty}
        isReachingEnd={isReachingEnd}
        isLoading={
          isLoadingInitialData || (isLoadingMore && (titles?.length ?? 0) > 0)
        }
        onScrollBottom={fetchMore}
      />
    </>
  );
};

export default DiscoverTvUpcoming;
