import React, { useEffect } from 'react';
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
import { Icon } from './Icon';

export type MrSortField = 'name' | 'company' | 'createdAt' | 'updatedAt';
export type MrSortOrder = 'asc' | 'desc';

export interface MrSortOptionConfig {
  id: string;
  sortBy: MrSortField;
  sortOrder: MrSortOrder;
  label: string;
  sublabel?: string;
}

export interface MrSortCategoryGroup {
  id: string;
  title: string;
  options: MrSortOptionConfig[];
}

export const MR_SORT_CATEGORIES: MrSortCategoryGroup[] = [
  {
    id: 'name',
    title: 'Name',
    options: [
      { id: 'name:asc', sortBy: 'name', sortOrder: 'asc', label: 'A → Z', sublabel: 'Alphabetical' },
      { id: 'name:desc', sortBy: 'name', sortOrder: 'desc', label: 'Z → A', sublabel: 'Reverse alphabetical' },
    ],
  },
  {
    id: 'company',
    title: 'Company / Manufacturer',
    options: [
      { id: 'company:asc', sortBy: 'company', sortOrder: 'asc', label: 'A → Z', sublabel: 'Company A to Z' },
      { id: 'company:desc', sortBy: 'company', sortOrder: 'desc', label: 'Z → A', sublabel: 'Company Z to A' },
    ],
  },
  {
    id: 'createdAt',
    title: 'Date Added',
    options: [
      { id: 'createdAt:desc', sortBy: 'createdAt', sortOrder: 'desc', label: 'Newest First', sublabel: 'Recently added' },
      { id: 'createdAt:asc', sortBy: 'createdAt', sortOrder: 'asc', label: 'Oldest First', sublabel: 'Earliest added' },
    ],
  },
  {
    id: 'updatedAt',
    title: 'Date Modified',
    options: [
      { id: 'updatedAt:desc', sortBy: 'updatedAt', sortOrder: 'desc', label: 'Recently Updated', sublabel: 'Last changed' },
    ],
  },
];

export interface MrSortModalProps {
  visible: boolean;
  sortBy: MrSortField;
  sortOrder: MrSortOrder;
  onApply: (sortBy: MrSortField, sortOrder: MrSortOrder) => void;
  onClose: () => void;
}

export const MrSortModal: React.FC<MrSortModalProps> = ({
  visible,
  sortBy,
  sortOrder,
  onApply,
  onClose,
}) => {
  const [selectedSortBy, setSelectedSortBy] = React.useState<MrSortField>(sortBy);
  const [selectedSortOrder, setSelectedSortOrder] = React.useState<MrSortOrder>(sortOrder);
  const prevVisibleRef = React.useRef(visible);

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      setSelectedSortBy(sortBy);
      setSelectedSortOrder(sortOrder);

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl && activeEl !== document.body && typeof activeEl.blur === 'function') {
          activeEl.blur();
        }
      }
    }
    prevVisibleRef.current = visible;
  }, [visible, sortBy, sortOrder]);

  const handleSelectOption = (optSortBy: MrSortField, optSortOrder: MrSortOrder) => {
    setSelectedSortBy(optSortBy);
    setSelectedSortOrder(optSortOrder);
    onApply(optSortBy, optSortOrder);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="mr-sort-modal"
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close sort modal"
          testID="mr-sort-modal-backdrop"
        />

        <View style={styles.sheet} testID="mr-sort-modal-content">
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Icon name="sort" size={20} color={colors.primary} />
              <Text style={styles.title}>Sort Medical Representatives</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
              testID="close-mr-sort-modal-button"
            >
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {MR_SORT_CATEGORIES.map((category) => (
              <View key={category.id} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <View style={styles.optionsList}>
                  {category.options.map((option) => {
                    const isSelected =
                      selectedSortBy === option.sortBy && selectedSortOrder === option.sortOrder;

                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                        onPress={() => handleSelectOption(option.sortBy, option.sortOrder)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`${category.title} ${option.label}`}
                        testID={`mr-sort-option-${option.id}`}
                      >
                        <View style={styles.optionContent}>
                          <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                            {option.label}
                          </Text>
                          {option.sublabel ? (
                            <Text style={styles.optionSublabel}>{option.sublabel}</Text>
                          ) : null}
                        </View>
                        <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                          {isSelected ? <View style={styles.radioInner} /> : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    width: '100%',
    ...theme.shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  optionsList: {
    gap: spacing.xs,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionItemSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: colors.primary,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.textPrimary,
  },
  optionLabelSelected: {
    color: colors.primary,
    fontWeight: fontWeights.bold,
  },
  optionSublabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  applyButton: {
    width: '100%',
  },
});
