import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Switch } from 'react-native-paper';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';

interface FormSwitchProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  description?: string;
  disabled?: boolean;
}

export const FormSwitch = <T extends FieldValues>({
  name,
  control,
  label,
  description,
  disabled = false,
}: FormSwitchProps<T>) => {
  const { colors } = useTheme();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value } }) => (
        <View style={styles.container}>
          <View style={styles.textContainer}>
            <Text style={[styles.label, { color: colors.text.primary }]}>{label}</Text>
            {description && <Text style={[styles.description, { color: colors.text.secondary }]}>{description}</Text>}
          </View>
          <Switch
            value={!!value}
            onValueChange={onChange}
            disabled={disabled}
            color={colors.primary.main}
          />
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    marginBottom: spacing[2],
  },
  textContainer: {
    flex: 1,
    marginRight: spacing[3],
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    marginTop: spacing[1],
  },
});
