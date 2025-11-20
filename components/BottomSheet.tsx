import React, { useEffect } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[];
  defaultSnapPoint?: number;
  enablePanDownToClose?: boolean;
}

export default function BottomSheet({
  visible,
  onClose,
  children,
  snapPoints = [SCREEN_HEIGHT * 0.4, SCREEN_HEIGHT * 0.7],
  defaultSnapPoint = 0,
  enablePanDownToClose = true,
}: BottomSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);
  const keyboardHeight = useSharedValue(0);

  useEffect(() => {
    // Eğer snapPoints 0-1 arası değerler içeriyorsa (percentage), SCREEN_HEIGHT ile çarp
    const normalizedSnapPoints = snapPoints.map((point) => 
      point <= 1 ? SCREEN_HEIGHT * point : point
    );

    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      // Sheet bottom: 0'da başlıyor, yukarı çıkmak için negatif translateY
      // targetHeight kadar yukarı çıkarmak için: translateY = -targetHeight

      // Sheet'i bottom'dan targetHeight kadar yukarı çıkar
      const targetY = 0;
      translateY.value = withSpring(targetY, {
        damping: 15,
        stiffness: 150,
        mass: 0.5,
      });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withSpring(SCREEN_HEIGHT, {
        damping: 15,
        stiffness: 150,
        mass: 0.5,
      });
      keyboardHeight.value = 0;
    }
  }, [visible, defaultSnapPoint, snapPoints]);

  useEffect(() => {
    if (!visible) return;

    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        keyboardHeight.value = withTiming(e.endCoordinates.height, {
          duration: Platform.OS === 'ios' ? e.duration || 250 : 100,
        });
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        keyboardHeight.value = withTiming(0, {
          duration: Platform.OS === 'ios' ? e.duration || 250 : 100,
        });
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    pointerEvents: visible ? 'auto' : 'none',
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value - keyboardHeight.value }],
  }));

  const handleBackdropPress = () => {
    if (enablePanDownToClose) {
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      style={StyleSheet.absoluteFill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[
          styles.backdrop,
          backdropStyle,
          { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          sheetStyle,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        {children}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
});

