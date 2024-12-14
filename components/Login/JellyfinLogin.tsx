import { View } from "react-native";
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from "react-intl";
import * as Yup from 'yup';
import { Formik } from 'formik';
import ThemedText from '@/components/Common/ThemedText';
import TextInput from '@/components/Common/TextInput';
import Button from '@/components/Common/Button';
import type { RootState } from '@/store';
import getJellyseerrMessages from "@/utils/getJellyseerrMessages";

const messages = getJellyseerrMessages('components.Login');

export default function JellyfinLogin() {
  const dispatch = useDispatch();
  const serverUrl = useSelector((state: RootState) => state.appSettings.serverUrl);
  const intl = useIntl();

  const LoginSchema = Yup.object().shape({
    username: Yup.string().required(
      intl.formatMessage(messages.validationusernamerequired)
    ),
    password: Yup.string(),
  });

  return (
    <View className="mt-8 w-full bg-gray-800/50 px-10 py-8">
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
            if (!res.ok) throw new Error();
            console.log('Login successful');
          } catch (e) {
            // toasts.addToast(
            //   intl.formatMessage(
            //     e.message == 'Request failed with status code 401'
            //       ? messages.credentialerror
            //       : messages.loginerror
            //   ),
            //   {
            //     autoDismiss: true,
            //     appearance: 'error',
            //   }
            // );
          } finally {
            // revalidate();
          }
        }}
      >
        {({ errors, touched, isSubmitting, isValid, values, handleChange, handleBlur, handleSubmit }) => {
          return (
            <View>
              <View className="sm:border-t sm:border-gray-800">
                <ThemedText className="font-bold text-gray-400">
                  {intl.formatMessage(messages.username)}
                </ThemedText>
                <View className="mt-1 mb-2 sm:col-span-2 sm:mt-0">
                  <View className="flex max-w-lg rounded-md shadow-sm">
                    <TextInput
                      onChangeText={handleChange('username')}
                      onBlur={handleBlur('username')}
                      value={values.username}
                      placeholder={intl.formatMessage(messages.username)}
                    />
                  </View>
                  {errors.username && touched.username && (
                    <ThemedText className="text-red-500 mt-1.5">{errors.username}</ThemedText>
                  )}
                </View>
                <ThemedText className="font-bold text-gray-400">
                  {intl.formatMessage(messages.password)}
                </ThemedText>
                <View className="mt-1 mb-2 sm:col-span-2 sm:mt-0">
                  <View className="flex max-w-lg rounded-md shadow-sm">
                    <TextInput
                      onChangeText={handleChange('password')}
                      onBlur={handleBlur('password')}
                      value={values.password}
                      placeholder={intl.formatMessage(messages.password)}
                      secureTextEntry={true}
                    />
                  </View>
                  {errors.password && touched.password && (
                    <ThemedText className="text-red-500 mt-1.5">{errors.password}</ThemedText>
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
                  <View className="inline-flex rounded-md shadow-sm self-end">
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
    </View>
  );
}