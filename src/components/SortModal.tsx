import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { borderRadius, colors, fontSizes, fontWeights, spacing, theme } from '../theme';
import { Button } from './Button';
import { Icon } from './Icon';

export type MedicineSortField = 'name' | 'mrp' | 'margin' | 'packQuantity' | 'createdAt' | 'updatedAt';
export type SortOrder = 'asc' | 'desc';

export interface SortOptionConfig {
  id: string;
  sortBy: MedicineSortField;
  sortOrder: SortOrder;
  label: string;
  sublabel?: string;
}

export interface SortCategoryGroup {
  id: string;
  title: string;
  options: SortOptionConfig[];
}

export const SORT_CATEGORIES: SortCategoryGroup[] = [
  {
    id: 'name',
    title: 'Name',
    options: [
      { id: 'name:asc', sortBy: 'name', sortOrder: 'asc', label: 'A → Z', sublabel: 'Alphabetical' },
      { id: 'name:desc', sortBy: 'name', sortOrder: 'desc', label: 'Z → A', sublabel: 'Reverse' },
    ],
  },
  {
    id: 'margin',
    title: 'Margin (%)',
    options: [
      { id: 'margin:desc', sortBy: 'margin', sortOrder: 'desc', label: 'High → Low', sublabel: 'Highest margin first' },
      { id: 'margin:asc', sortBy: 'margin', sortOrder: 'asc', label: 'Low → High', sublabel: 'Lowest margin first' },
    ],
  },
  {
    id: 'mrp',
    title: 'MRP (Price)',
    options: [
      { id: 'mrp:asc', sortBy: 'mrp', sortOrder: 'asc', label: 'Low → High', sublabel: 'Ascending price' },
      { id: 'mrp:desc', sortBy: 'mrp', sortOrder: 'desc', label: 'High → Low', sublabel: 'Descending price' },
    ],
  },
  {
    id: 'packQuantity',
    title: 'Pack Quantity',
    options: [
      { id: 'packQuantity:asc', sortBy: 'packQuantity', sortOrder: 'asc', label: 'Low → High', sublabel: 'Smallest pack first' },
      { id: 'packQuantity:desc', sortBy: 'packQuantity', sortOrder: 'desc', label: 'High → Low', sublabel: 'Largest pack first' },
    ],
  },
  {
    id: 'createdAt',
    title: 'Recently Added',
    options: [
      { id: 'createdAt:desc', sortBy: 'createdAt', sortOrder: 'desc', label: 'Newest First', sublabel: 'Recently added' },
      { id: 'createdAt:asc', sortBy: 'createdAt', sortOrder: 'asc', label: 'Oldest First', sublabel: 'First added' },
    ],
  },
  {
    id: 'updatedAt',
    title: 'Recently Updated',
    options: [
      { id: 'updatedAt:desc', sortBy: 'updatedAt', sortOrder: 'desc', label: 'Newest First', sublabel: 'Recently modified' },
      { id: 'updatedAt:asc', sortBy: 'updatedAt', sortOrder: 'asc', label: 'Oldest First', sublabel: 'Least recently modified' },
    ],
  },
];

export interface SortModalProps {
  visible: boolean;
  sortBy: MedicineSortField;
  sortOrder: SortOrder;
  onSelectSort: (sortBy: MedicineSortField, sortOrder: SortOrder) => void;
  onClose: () => void;
}

export const SortModal: React.FC<SortModalProps> = ({
  visible,
  sortBy,
  sortOrder,
  onSelectSort,
  onClose,
}) => {
  const currentKey = `${sortBy}:${sortOrder}`;

  const handleSelect = (option: SortOptionConfig) => {
    onSelectSort(option.sortBy, option.sortOrder);
    onClose();
  };

  const handleReset = () => {
    onSelectSort('name', 'asc');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Full-screen backdrop sibling: tapping closes modal */}
        <Pressable
          style={styles.backdropPressable}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close sort popup backdrop"
          testID="sort-modal-backdrop"
        />

        {/* Modal Popover Container */}
        <View style={styles.modalContainer} testID="sort-popup">
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Icon name="sort" size={20} color={colors.primary} />
              <Text style={styles.modalTitle}>Sort Medicines</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close sort popup"
              testID="close-sort-modal-button"
            >
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Sort Categories List */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {SORT_CATEGORIES.map((category) => (
              <View key={category.id} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <View style={styles.optionsGroup}>
                  {category.options.map((option) => {
                    const isSelected = currentKey === option.id;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.optionRow,
                          isSelected && styles.optionRowSelected,
                        ]}
                        onPress={() => handleSelect(option)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`${category.title}: ${option.label}`}
                        testID={`sort-option-${option.id}`}
                      >
                        <View style={styles.radioOuter}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                        <View style={styles.optionTextContainer}>
                          <Text
                            style={[
                              styles.optionLabel,
                              isSelected && styles.optionLabelSelected,
                            ]}
                          >
                            {option.label}
                          </Text>
                          {option.sublabel && (
                            <Text style={styles.optionSublabel}>
                              {option.sublabel}
                            </Text>
                          )}
                        </View>
                        {isSelected && (
                          <Icon name="check" size={16} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <Button
              title="Reset to Default"
              variant="outline"
              size="sm"
              onPress={handleReset}
              style={styles.footerButton}
              testID="reset-sort-button"
            />
            <Button
              title="Done"
              variant="primary"
              size="sm"
              onPress={onClose}
              style={styles.footerButton}
              testID="apply-sort-button"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  backdropPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    ...theme.shadows.lg,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
        }
      : {}),
    zIndex: 100,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.full,
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  categorySection: {
    marginBottom: spacing.md,
  },
  categoryTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  optionsGroup: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  optionRowSelected: {
    backgroundColor: colors.primaryLighter,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm + 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textPrimary,
  },
  optionLabelSelected: {
    fontWeight: fontWeights.bold,
    color: colors.primaryDark,
  },
  optionSublabel: {
    fontSize: fontSizes.xs - 1,
    color: colors.textSecondary,
    marginTop: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  footerButton: {
    flex: 1,
  },
});
