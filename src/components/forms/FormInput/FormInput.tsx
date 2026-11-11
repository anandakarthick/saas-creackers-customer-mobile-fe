import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { TextInput } from 'react-native-paper';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';

interface FormInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  disabled?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  style?: ViewStyle;
}

export const FormInput = <T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  numberOfLines = 1,
  maxLength,
  disabled = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
}: FormInputProps<T>) => {
  const { colors } = useTheme();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View style={[styles.container, style]}>
          <TextInput
            label={label}
            placeholder={placeholder}
            value={value?.toString() ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            multiline={multiline}
            numberOfLines={numberOfLines}
            maxLength={maxLength}
            disabled={disabled}
            error={!!error}
            mode="outlined"
            style={[styles.input, { backgroundColor: colors.surface.default }, multiline && { height: numberOfLines * 40 }]}
            outlineStyle={styles.outline}
            contentStyle={styles.content}
            left={leftIcon ? <TextInput.Icon icon={leftIcon} /> : undefined}
            right={
              rightIcon ? (
                <TextInput.Icon icon={rightIcon} onPress={onRightIconPress} />
              ) : undefined
            }
            theme={{
              colors: {
                primary: colors.primary.main,
                error: colors.error.main,
                outline: colors.border.default,
              },
            }}
          />
          {error && <Text style={[styles.errorText, { color: colors.error.main }]}>{error.message}</Text>}
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  input: {},
  outline: {
    borderRadius: borderRadius.md,
  },
  content: {
    paddingHorizontal: spacing[2],
  },
  errorText: {
    fontSize: 12,
    marginTop: spacing[1],
    marginLeft: spacing[2],
  },
});
