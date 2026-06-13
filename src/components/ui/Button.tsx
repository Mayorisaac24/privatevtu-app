import React from 'react';
import {
  TouchableOpacity, ActivityIndicator,
  ViewStyle, TextStyle, TouchableOpacityProps, View,
} from 'react-native';
import { Colors, Radius, Typography, Shadow } from '../../theme';
import { AppText } from './AppText';
import { isAndroid, platformSpacing } from '../../lib/platform-ui';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  title, variant = 'primary', size = 'md', isLoading = false,
  leftIcon, rightIcon, style, textStyle, disabled, fullWidth = true, ...props
}: ButtonProps) {
  const getBg = () => {
    if (variant === 'primary') return Colors.primary;
    if (variant === 'dark') return Colors.dark;
    if (variant === 'secondary') return Colors.primaryMuted;
    if (variant === 'danger') return Colors.error;
    return 'transparent';
  };

  const getTextColor = () => {
    if (variant === 'primary' || variant === 'danger' || variant === 'dark') return Colors.white;
    if (variant === 'secondary') return Colors.primary;
    return Colors.primary;
  };

  const getPadding = () => {
    if (size === 'sm') return { paddingVertical: platformSpacing(10), paddingHorizontal: 16 };
    if (size === 'lg') return { paddingVertical: platformSpacing(18), paddingHorizontal: 24 };
    return { paddingVertical: platformSpacing(15), paddingHorizontal: 20 };
  };

  const textVariant = size === 'sm' ? 'smallMed' : size === 'lg' ? 'bodyMed' : 'bodyMed';

  return (
    <TouchableOpacity
      style={[{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        borderRadius: Radius.md, opacity: disabled || isLoading ? 0.5 : 1,
        backgroundColor: getBg(), width: fullWidth ? '100%' : undefined,
        borderWidth: variant === 'outline' ? 1.5 : 0,
        borderColor: variant === 'outline' ? Colors.primary : undefined,
        ...(variant === 'primary' ? (isAndroid ? { elevation: 3 } : Shadow.md) : {}),
      }, getPadding(), style]}
      disabled={disabled || isLoading}
      activeOpacity={0.82}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {leftIcon ? <View style={{ marginRight: 8 }}>{leftIcon}</View> : null}
          <AppText
            variant={textVariant}
            weight="700"
            style={[{ color: getTextColor(), letterSpacing: 0.1 }, textStyle]}
          >
            {title}
          </AppText>
          {rightIcon ? <View style={{ marginLeft: 8 }}>{rightIcon}</View> : null}
        </>
      )}
    </TouchableOpacity>
  );
}
