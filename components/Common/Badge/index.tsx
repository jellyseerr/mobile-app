import ThemedText from '@/components/Common/ThemedText';
import React, { useState } from 'react';
import {
  Linking,
  type NativeSyntheticEvent,
  Pressable,
  type TextLayoutEventData,
} from 'react-native';

interface BadgeProps {
  badgeType?:
    | 'default'
    | 'primary'
    | 'danger'
    | 'warning'
    | 'success'
    | 'dark'
    | 'light';
  className?: string;
  href?: string;
  element?: React.ElementType;
  children: React.ReactNode;
}

const Badge = (
  { badgeType = 'default', className, href, children, element }: BadgeProps,
  ref?: React.Ref<HTMLElement>
) => {
  const [isWrapped, setIsWrapped] = useState(false);

  const badgeStyle = [
    'px-2 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap',
  ];

  if (href) {
    badgeStyle.push('transition cursor-pointer !no-underline');
  } else {
    badgeStyle.push('cursor-default');
  }

  switch (badgeType) {
    case 'danger':
      badgeStyle.push(
        'bg-red-600 bg-opacity-80 border-red-500 border !text-red-100'
      );
      if (href) {
        badgeStyle.push('hover:bg-red-500 bg-opacity-100');
      }
      break;
    case 'warning':
      badgeStyle.push(
        'bg-yellow-500 bg-opacity-80 border-yellow-500 border !text-yellow-100'
      );
      if (href) {
        badgeStyle.push('hover:bg-yellow-500 hover:bg-opacity-100');
      }
      break;
    case 'success':
      badgeStyle.push(
        'bg-green-500 bg-opacity-80 border border-green-500 !text-green-100'
      );
      if (href) {
        badgeStyle.push('hover:bg-green-500 hover:bg-opacity-100');
      }
      break;
    case 'dark':
      badgeStyle.push('bg-gray-900 !text-gray-400');
      if (href) {
        badgeStyle.push('hover:bg-gray-800');
      }
      break;
    case 'light':
      badgeStyle.push('bg-gray-700 !text-gray-300');
      if (href) {
        badgeStyle.push('hover:bg-gray-600');
      }
      break;
    default:
      badgeStyle.push(
        'bg-indigo-500 bg-opacity-80 border border-indigo-500 !text-indigo-100'
      );
      if (href) {
        badgeStyle.push('hover:bg-indigo-500 hover:bg-opacity-100');
      }
  }

  if (className) {
    badgeStyle.push(className);
  }
  if (isWrapped) {
    badgeStyle.push('w-full');
  }

  const Element = element ?? ThemedText;
  const props = {
    className: badgeStyle.join(' '),
    numberOfLines: 1,
    onTextLayout: (e: NativeSyntheticEvent<TextLayoutEventData>) => {
      if (e.nativeEvent.lines.length > 1) {
        setIsWrapped(true);
      }
    },
  };

  if (href?.includes('://')) {
    return (
      <Pressable
        onPress={() => {
          Linking.openURL(href as string);
        }}
      >
        <Element {...props}>{children}</Element>
      </Pressable>
    );
  } else if (href) {
    return (
      <Element href={href} {...props}>
        {children}
      </Element>
    );
  } else {
    return <Element {...props}>{children}</Element>;
  }
};

export default React.forwardRef(Badge) as typeof Badge;
