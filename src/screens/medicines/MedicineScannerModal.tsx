import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon, LoadingIndicator } from '../../components';
import { borderRadius, colors, fontSizes, fontWeights, spacing } from '../../theme';

export interface ScannedPhoto {
  uri: string;
  base64?: string | null;
  label: string;
}

export interface MedicineScannerModalProps {
  visible: boolean;
  onClose: () => void;
  scannedPhotos: ScannedPhoto[];
  isScanningOcr: boolean;
  onCapturePhoto: (source: 'camera' | 'library') => void;
  onRemovePhoto: (index: number) => void;
  onProcessPhotos: () => void;
  testID?: string;
}

const SCREEN_HEIGHT = Dimensions.get('window').height || 800;

export const MedicineScannerModal: React.FC<MedicineScannerModalProps> = ({
  visible,
  onClose,
  scannedPhotos,
  isScanningOcr,
  onCapturePhoto,
  onRemovePhoto,
  onProcessPhotos,
  testID = 'medicine-scanner-modal',
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
      // 1. Dark backdrop fades in in-place (opacity 0 -> 1)
      // 2. Scanner modal panel slides vertically upward from bottom (translateY SCREEN_HEIGHT -> 0)
      const openAnim = Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(panelAnim, {
          toValue: 1,
          duration: 260,
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
      // 1. Scanner modal panel slides downward (translateY 0 -> SCREEN_HEIGHT)
      // 2. Dark backdrop fades out in-place (opacity 1 -> 0)
      const closeAnim = Animated.parallel([
        Animated.timing(panelAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
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

  const handleDismiss = () => {
    if (!isScanningOcr) {
      onClose();
    }
  };

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
      testID={testID}
    >
      <View style={styles.modalOverlay}>
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
            onPress={handleDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close scanner modal"
            testID="scanner-modal-backdrop"
          />
        </Animated.View>

        {/* Layer 2: Scanner Modal Panel - bottom sheet with translateY animation ONLY */}
        <Animated.View
          style={[
            styles.scannerModalCard,
            {
              transform: [{ translateY: panelTranslateY }],
            },
          ]}
          renderToHardwareTextureAndroid={true}
          testID={`${testID}-content`}
        >
          {/* Header */}
          <View style={styles.scannerModalHeader}>
            <View style={styles.scannerModalTitleCol}>
              <Text style={styles.scannerModalTitle}>Scan Medicine Packaging</Text>
              <Text style={styles.scannerModalSubtitle}>
                Capture photos of front, back, or side packaging
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleDismiss}
              disabled={isScanningOcr}
              style={styles.scannerModalCloseBtn}
              testID="btn-close-scanner-modal"
            >
              <Icon name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Photos Preview Horizontal Gallery */}
          <View style={styles.scannerPhotosContainer}>
            {scannedPhotos.length === 0 ? (
              <View style={styles.scannerEmptyPhotos}>
                <Icon name="camera" size={36} color="#9CA3AF" />
                <Text style={styles.scannerEmptyText}>No packaging photos captured yet</Text>
                <Text style={styles.scannerEmptySubtext}>
                  Start by taking a clear photo of the front of the box or strip.
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.scannerThumbnailsScroll}
              >
                {scannedPhotos.map((photo, idx) => (
                  <View
                    key={idx}
                    style={styles.scannerThumbnailItem}
                    testID={`scanned-photo-card-${idx}`}
                  >
                    <Image source={{ uri: photo.uri }} style={styles.scannerThumbnailImage} />
                    <View style={styles.scannerThumbnailLabelRow}>
                      <Text style={styles.scannerThumbnailLabel} numberOfLines={1}>
                        {photo.label}
                      </Text>
                      <TouchableOpacity
                        onPress={() => onRemovePhoto(idx)}
                        style={styles.scannerRemovePhotoBtn}
                        testID={`remove-photo-${idx}`}
                      >
                        <Icon name="delete" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Capture Action Buttons */}
          <View style={styles.scannerCaptureRow}>
            <TouchableOpacity
              style={styles.scannerCaptureBtn}
              onPress={() => onCapturePhoto('camera')}
              disabled={isScanningOcr}
              testID="btn-capture-camera"
            >
              <Icon name="camera" size={18} color="#FFFFFF" />
              <Text style={styles.scannerCaptureBtnText}>
                {scannedPhotos.length === 0 ? 'Take Photo (Camera)' : '+ Add Another Photo'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.scannerGalleryBtn}
              onPress={() => onCapturePhoto('library')}
              disabled={isScanningOcr}
              testID="btn-capture-gallery"
            >
              <Icon name="image" size={18} color="#374151" />
              <Text style={styles.scannerGalleryBtnText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>

          {/* Process Button */}
          <View style={styles.scannerFooterActions}>
            <TouchableOpacity
              style={[
                styles.scannerProcessBtn,
                (scannedPhotos.length === 0 || isScanningOcr) && styles.scannerProcessBtnDisabled,
              ]}
              onPress={onProcessPhotos}
              disabled={scannedPhotos.length === 0 || isScanningOcr}
              testID="btn-process-photos"
            >
              {isScanningOcr ? (
                <View style={styles.scannerLoadingRow}>
                  <LoadingIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.scannerProcessBtnText}>Extracting text & details...</Text>
                </View>
              ) : (
                <Text style={styles.scannerProcessBtnText}>
                  Extract & Fill Form ({scannedPhotos.length}{' '}
                  {scannedPhotos.length === 1 ? 'Photo' : 'Photos'})
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scannerModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
  },
  scannerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  scannerModalTitleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  scannerModalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: '#111827',
  },
  scannerModalSubtitle: {
    fontSize: fontSizes.xs,
    color: '#6B7280',
    marginTop: 2,
  },
  scannerModalCloseBtn: {
    padding: spacing.xs,
  },
  scannerPhotosContainer: {
    marginBottom: spacing.base,
  },
  scannerEmptyPhotos: {
    height: 120,
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
  },
  scannerEmptyText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: '#4B5563',
    marginTop: spacing.xs,
  },
  scannerEmptySubtext: {
    fontSize: fontSizes.xs,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 2,
  },
  scannerThumbnailsScroll: {
    flexDirection: 'row',
  },
  scannerThumbnailItem: {
    width: 110,
    marginRight: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  scannerThumbnailImage: {
    width: '100%',
    height: 80,
    backgroundColor: '#E5E7EB',
  },
  scannerThumbnailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
  },
  scannerThumbnailLabel: {
    flex: 1,
    fontSize: 10,
    color: '#374151',
    fontWeight: fontWeights.semibold,
  },
  scannerRemovePhotoBtn: {
    padding: 2,
  },
  scannerCaptureRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  scannerCaptureBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: borderRadius.md,
  },
  scannerCaptureBtnText: {
    color: '#FFFFFF',
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
  },
  scannerGalleryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 12,
    borderRadius: borderRadius.md,
  },
  scannerGalleryBtnText: {
    color: '#374151',
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
  scannerFooterActions: {
    marginTop: spacing.xs,
  },
  scannerProcessBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerProcessBtnDisabled: {
    opacity: 0.5,
  },
  scannerProcessBtnText: {
    color: '#FFFFFF',
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
  scannerLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
