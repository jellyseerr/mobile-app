import Button from '@/components/Common/Button';
import TextInput from '@/components/Common/TextInput';
import ThemedText from '@/components/Common/ThemedText';
import useServerUrl from '@/hooks/useServerUrl';
import { ApiErrorCode } from '@/jellyseerr/server/constants/error';
import getJellyseerrMessages from '@/utils/getJellyseerrMessages';
import { toast } from '@backpackapp-io/react-native-toast';
import { router } from 'expo-router';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';
import { View } from 'react-native';
import * as Yup from 'yup';

const messages = getJellyseerrMessages('components.Login');

export default function JellyfinLogin() {
  const serverUrl = useServerUrl();
  const intl = useIntl();

  const LoginSchema = Yup.object().shape({
    username: Yup.string().required(
      intl.formatMessage(messages.validationusernamerequired)
    ),
    password: Yup.string(),
  });

  return (
    <Formik
      initialValues={{
        username: '',
        password: '',
      }}
      validationSchema={LoginSchema}
      onSubmit={async (values) => {
        try {
          const res = await fetch(`${serverUrl}/api/v1/auth/jellyfin`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: values.username,
              password: values.password,
              email: values.username,
            }),
          });
          if (!res.ok) throw new Error(res.statusText, { cause: res });
          router.replace('/(tabs)');
        } catch (e) {
          let errorData;
          try {
            errorData = await e.cause?.text();
            errorData = JSON.parse(errorData);
          } catch {
            /* empty */
          }
          let errorMessage = null;
          switch (errorData?.message) {
            case ApiErrorCode.InvalidUrl:
              errorMessage = messages.invalidurlerror;
              break;
            case ApiErrorCode.InvalidCredentials:
              errorMessage = messages.credentialerror;
              break;
            case ApiErrorCode.NotAdmin:
              errorMessage = messages.adminerror;
              break;
            case ApiErrorCode.NoAdminUser:
              errorMessage = messages.noadminerror;
              break;
            default:
              errorMessage = messages.loginerror;
              break;
          }
          toast.error(
            intl.formatMessage(errorMessage, mediaServerFormatValues)
          );
        }
      }}
    >
      {({
        errors,
        touched,
        isSubmitting,
        isValid,
        values,
        handleChange,
        handleBlur,
        handleSubmit,
      }) => {
        return (
          <View>
            <View className="sm:border-t sm:border-gray-800">
              <ThemedText className="font-bold text-gray-400">
                {intl.formatMessage(messages.username)}
              </ThemedText>
              <View className="mb-2 mt-1 sm:col-span-2 sm:mt-0">
                <View className="flex max-w-lg rounded-md shadow-sm">
                  <TextInput
                    onChangeText={handleChange('username')}
                    onBlur={handleBlur('username')}
                    value={values.username}
                    placeholder={intl.formatMessage(messages.username)}
                    autoCapitalize="none"
                  />
                </View>
                {errors.username && touched.username && (
                  <ThemedText className="mt-1.5 text-red-500">
                    {errors.username}
                  </ThemedText>
                )}
              </View>
              <ThemedText className="font-bold text-gray-400">
                {intl.formatMessage(messages.password)}
              </ThemedText>
              <View className="mb-2 mt-1 sm:col-span-2 sm:mt-0">
                <View className="flex max-w-lg rounded-md shadow-sm">
                  <TextInput
                    onChangeText={handleChange('password')}
                    onBlur={handleBlur('password')}
                    value={values.password}
                    placeholder={intl.formatMessage(messages.password)}
                    autoCapitalize="none"
                    secureTextEntry={true}
                  />
                </View>
                {errors.password && touched.password && (
                  <ThemedText className="mt-1.5 text-red-500">
                    {errors.password}
                  </ThemedText>
                )}
              </View>
            </View>
            <View className="mt-8 border-t border-gray-700 pt-5">
              <View className="flex justify-between">
                {/* <View className="inline-flex rounded-md shadow-sm">
                  <Button
                    as="a"
                    buttonType="ghost"
                    href={
                      jellyfinForgotPasswordUrl
                        ? `${jellyfinForgotPasswordUrl}`
                        : `${baseUrl}/web/index.html#!/${
                            settings.currentSettings.mediaServerType ===
                            MediaServerType.EMBY
                              ? 'startup/'
                              : ''
                          }forgotpassword.html`
                    }
                  >
                    {intl.formatMessage(messages.forgotpassword)}
                  </Button>
                </View> */}
                <View className="inline-flex self-end rounded-md shadow-sm">
                  <Button
                    disabled={isSubmitting || !isValid}
                    onClick={() => handleSubmit()}
                  >
                    {isSubmitting
                      ? intl.formatMessage(messages.signingin)
                      : intl.formatMessage(messages.signin)}
                  </Button>
                </View>
              </View>
            </View>
          </View>
        );
      }}
    </Formik>
  );
}
