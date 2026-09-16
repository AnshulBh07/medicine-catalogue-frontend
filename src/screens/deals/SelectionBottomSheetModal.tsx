import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { borderRadius, spacing } from '../../theme';

export interface SelectionBottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  testID?: string;
}

export const SCREEN_HEIGHT = Dimensions.get('window').height || 800;

export const SelectionBottomSheetModal: React.FC<SelectionBottomSheetModalProps> = ({
  visible,
  onClose,
  children,
  testID = 'selection-bottom-sheet-modal',
}) => {
  const [modalVisible, setModalVisible] = useState(visible);
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const panelAnim = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);
  const isMountedRef = useRef(true);
  const activeAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (activeAnimationRef.current) {
        activeAnimationRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      setModalVisible(true);
      if (activeAnimationRef.current) {
        activeAnimationRef.current.stop();
      }

      // Reset values to start of opening sequence
      backdropAnim.setValue(0);
      panelAnim.setValue(0);

      // Opening animation:
      // 1. Dark backdrop fades in (opacity 0 -> 1)
      // 2. Modal panel slides upward from bottom (translateY SCREEN_HEIGHT -> 0)
      const openAnim = Animated.sequence([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(panelAnim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);

      activeAnimationRef.current = openAnim;
      openAnim.start(({ finished }) => {
        if (finished) {
          activeAnimationRef.current = null;
        }
      });
    } else if (modalVisible && !isClosingRef.current) {
      isClosingRef.current = true;
      if (activeAnimationRef.current) {
        activeAnimationRef.current.stop();
      }

      // Closing animation:
      // 1. Modal panel slides downward (translateY 0 -> SCREEN_HEIGHT)
      // 2. Dark backdrop fades out (opacity 1 -> 0)
      const closeAnim = Animated.sequence([
        Animated.timing(panelAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]);

      activeAnimationRef.current = closeAnim;
      closeAnim.start(({ finished }) => {
        if (isMountedRef.current && finished) {
          setModalVisible(false);
          isClosingRef.current = false;
          activeAnimationRef.current = null;
        }
      });
    }
  }, [visible, modalVisible, backdropAnim, panelAnim]);

  const shouldRender = visible || modalVisible;
  if (!shouldRender) {
    return null;
  }

  // Panel translates vertically from SCREEN_HEIGHT (0) to 0 (1)
  const panelTranslateY = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 0],
  });

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      testID={testID}
    >
      <View style={styles.modalContainer}>
        {/* Layer 1: Dark Backdrop - completely stationary, edge-to-edge, opacity animation ONLY */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropAnim,
            },
          ]}
          renderToHardwareTextureAndroid={true}
          needsOffscreenAlphaCompositing={true}
          testID={`${testID}-backdrop-container`}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close modal"
            testID={`${testID}-backdrop`}
          />
        </Animated.View>

        {/* Layer 2: Modal Panel - bottom sheet with translateY animation ONLY */}
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{ translateY: panelTranslateY }],
            },
          ]}
          renderToHardwareTextureAndroid={true}
          onStartShouldSetResponder={() => true}
          testID={`${testID}-content`}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.md,
  },
});
