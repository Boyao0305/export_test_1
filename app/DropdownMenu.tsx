import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import React from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface DropdownMenuProps {
  visible: boolean;
  onClose: () => void;
  onHistoryPress: () => void;
  onFavoritesPress: () => void;
  onNotesPress: () => void;
  buttonPosition: { x: number; y: number; width: number; height: number };
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  visible,
  onClose,
  onHistoryPress,
  onFavoritesPress,
  onNotesPress,
  buttonPosition,
}) => {
  const { theme } = useTheme();

  const handleBackdropPress = () => {
    onClose();
  };

  const handleHistoryPress = () => {
    onHistoryPress();
    onClose();
  };

  const handleFavoritesPress = () => {
    onFavoritesPress();
    onClose();
  };

  const handleNotesPress = () => {
    onNotesPress();
    onClose();
  };

  // 计算菜单位置 - 使用指定的CSS尺寸
  // 只有一个菜单项，所以高度可以更小
  const menuWidth = 147;
  const menuHeight = 57; // 单个菜单项的高度（约 57px）
  const menuX = Math.min(buttonPosition.x + buttonPosition.width - menuWidth, width - menuWidth - 16);
  
  // 确保菜单显示在 Header 下方
  // Header 高度是 70，SafeArea 顶部偏移通常是 44 (iOS) 或 0 (Android)
  const headerHeight = 70;
  const safeAreaTop = Platform.OS === 'ios' ? 44 : 0;
  const headerBottom = safeAreaTop + headerHeight;
  const calculatedMenuY = buttonPosition.y + buttonPosition.height + 8;
  // 菜单至少应该在 Header 下方，所以取两者中的较大值
  const menuY = Math.max(calculatedMenuY, headerBottom + 4);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot} pointerEvents="box-none">
        {/* Backdrop 单独一层，避免抢占菜单项触控 */}
        <Pressable style={styles.backdrop} onPress={handleBackdropPress} />

        <View
          style={[
            styles.menu,
            {
              position: 'absolute',
              left: menuX,
              top: menuY,
              width: menuWidth,
              height: menuHeight,
            },
          ]}
        >
          <Svg
            width={menuWidth}
            height={menuHeight}
            pointerEvents="none"
           >
            {/* SVG背景 */}
            <Path
              d={`M0,8 Q0,0 8,0 L${menuWidth-8},0 Q${menuWidth},0 ${menuWidth},8 L${menuWidth},${menuHeight-8} Q${menuWidth},${menuHeight} ${menuWidth-8},${menuHeight} L8,${menuHeight} Q0,${menuHeight} 0,${menuHeight-8} Z`}
              fill={theme.colors.background}
              stroke="#E0E0E0"
              strokeWidth="1"
            />
          </Svg>
          
          <View style={styles.menuContent}>
          {/* 历史文章 */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleHistoryPress}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="time-outline" size={20} color="#0C1A30" />
            <Text style={styles.menuText}>历史文章</Text>
          </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  menu: {
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  menuContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuText: {
    fontSize: 14,
    fontFamily: Platform.select({ ios: 'DM Sans', android: 'sans-serif' }),
    fontWeight: '500',
    color: '#0C1A30',
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
});