import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';

interface SelectOption {
  label: string;
  value: string;
}

interface FormSelectProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}

export const FormSelect = <T extends FieldValues>({
  name,
  control,
  label,
  options,
  placeholder = 'Select an option',
  disabled = false,
}: FormSelectProps<T>) => {
  const [modalVisible, setModalVisible] = useState(false);
  const { colors } = useTheme();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        const selectedOption = options.find((opt) => opt.value === value);

        return (
          <View style={styles.container}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>{label}</Text>
            <TouchableOpacity
              style={[
                styles.selectButton,
                { backgroundColor: colors.surface.default, borderColor: colors.border.default },
                error && { borderColor: colors.error.main },
                disabled && { backgroundColor: colors.surface.disabled },
              ]}
              onPress={() => !disabled && setModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.selectText,
                  { color: colors.text.primary },
                  !selectedOption && { color: colors.text.tertiary },
                ]}
              >
                {selectedOption?.label || placeholder}
              </Text>
              <Icon name="chevron-down" size={24} color={colors.neutral[500]} />
            </TouchableOpacity>
            {error && <Text style={[styles.errorText, { color: colors.error.main }]}>{error.message}</Text>}

            <Modal
              visible={modalVisible}
              transparent
              animationType="slide"
              onRequestClose={() => setModalVisible(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setModalVisible(false)}
              >
                <View style={[styles.modalContent, { backgroundColor: colors.surface.default }]}>
                  <View style={[styles.modalHeader, { borderBottomColor: colors.border.default }]}>
                    <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{label}</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <Icon name="close" size={24} color={colors.neutral[700]} />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={options}
                    keyExtractor={(item) => item.value}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.optionItem,
                          { borderBottomColor: colors.border.default },
                          item.value === value && { backgroundColor: colors.primary.light + '20' },
                        ]}
                        onPress={() => {
                          onChange(item.value);
                          setModalVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            { color: colors.text.primary },
                            item.value === value && { color: colors.primary.main, fontWeight: '500' },
                          ]}
                        >
                          {item.label}
                        </Text>
                        {item.value === value && (
                          <Icon name="check" size={20} color={colors.primary.main} />
                        )}
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  label: {
    fontSize: 12,
    marginBottom: spacing[1],
    marginLeft: spacing[2],
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    minHeight: 56,
  },
  selectText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: spacing[1],
    marginLeft: spacing[2],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 16,
  },
});
