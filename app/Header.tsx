import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  showMenuButton?: boolean;
  showNotificationButton?: boolean;
  showHamburgerMenu?: boolean;
  onBackPress?: () => void;
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
  onHamburgerPress?: () => void;
  backgroundColor?: string;
  titleColor?: string;
  iconColor?: string;
  customRightComponent?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Read Ease',
  showBackButton = false,
  showMenuButton = true,
  showNotificationButton = true,
  showHamburgerMenu = false,
  onBackPress,
  onMenuPress,
  onNotificationPress,
  onHamburgerPress,
  backgroundColor,
  titleColor = '#FC9B33',
  iconColor = '#0C1A30',
  customRightComponent,
}: HeaderProps) => {
  const router = useRouter();
  const { theme } = useTheme();
  const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const handleMenuPress = () => {
    if (onMenuPress) {
      onMenuPress();
    }
    // 默认菜单行为可以在这里添加
  };

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      router.push('../../test');
    }
  };

  const handleHamburgerPress = () => {
    if (onHamburgerPress) {
      onHamburgerPress();
    }
  };

  return (
    <View style={[
      styles.header,
      { 
        backgroundColor: backgroundColor || theme.colors.background,
      }
    ]}>
      {/* Title (absolute, behind buttons) */}
      <View pointerEvents="none" style={styles.titleContainer}>
        <Text style={[styles.headerTitle, { color: titleColor }]}>
          {title}
        </Text>
      </View>

      {/* Left Button */}
      <View style={styles.leftButton}>
        {showBackButton ? (
          <TouchableOpacity
            style={[styles.button, styles.leftButtonTouchable]}
            hitSlop={hitSlop}
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={24} color={iconColor} />
          </TouchableOpacity>
        ) : showMenuButton ? (
          <TouchableOpacity
            style={[styles.button, styles.leftButtonTouchable]}
            hitSlop={hitSlop}
            onPress={handleMenuPress}
          >
            <Ionicons name="menu" size={24} color={iconColor} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Right Button */}
      <View style={styles.rightButton}>
        {customRightComponent ? (
          customRightComponent
        ) : showHamburgerMenu ? (
          <TouchableOpacity
            style={[styles.button, styles.rightButtonTouchable]}
            hitSlop={hitSlop}
            onPress={handleHamburgerPress}
          >
            <Ionicons name="menu" size={24} color={iconColor} />
          </TouchableOpacity>
        ) : showNotificationButton ? (
          <TouchableOpacity
            style={[styles.button, styles.rightButtonTouchable]}
            hitSlop={hitSlop}
            onPress={handleNotificationPress}
          >
            <Ionicons name="notifications" size={24} color={iconColor} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.015,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 10,
    zIndex: 9990, // 确保Header在Modal之上
    height: 70,
  },
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Platform.select({ ios: 'DM Sans', android: 'sans-serif' }),
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 80,
  },
  leftButton: {
    width: 44,
    alignItems: 'flex-start',
    zIndex: 1,
  },
  rightButton: {
    minWidth: 44,
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexShrink: 0,
    zIndex: 1,
  },
  button: {
    padding: 8,
  },
  leftButtonTouchable: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  rightButtonTouchable: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  placeholder: {
    width: 44,
  },
});