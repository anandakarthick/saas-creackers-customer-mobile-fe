import React, { useState } from 'react';
import { StyleSheet, View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AuthStackScreenProps } from '@/types/navigation';
import { forgotPasswordSchema, ForgotPasswordFormData } from '@/utils/validators';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/common';
import { FormInput } from '@/components/forms';

export const ForgotPasswordScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<AuthStackScreenProps<'ForgotPassword'>['navigation']>();
  const insets = useSafeAreaInsets();
  const { forgotPassword, isLoading } = useAuth();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { control, handleSubmit, getValues } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await forgotPassword(data.email);
      setIsSubmitted(true);
    } catch {
      // Error handled in hook
    }
  };

  if (isSubmitted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background.default }]}>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: colors.success.light + '20' }]}>
            <Icon name="email-check" size={64} color={colors.success.main} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text.primary }]}>Check Your Email</Text>
          <Text style={[styles.successMessage, { color: colors.text.secondary }]}>
            We've sent password reset instructions to{'\n'}
            <Text style={[styles.emailText, { color: colors.text.primary }]}>{getValues('email')}</Text>
          </Text>
          <Button
            onPress={() => navigation.navigate('Login')}
            fullWidth
            style={styles.backButton}
          >
            Back to Login
          </Button>
          <Button
            variant="text"
            onPress={() => setIsSubmitted(false)}
          >
            Didn't receive email? Try again
          </Button>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background.default }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing[4], paddingBottom: insets.bottom + spacing[4] },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <Button
          variant="text"
          icon="arrow-left"
          onPress={() => navigation.goBack()}
          style={styles.backButtonTop}
        >
          Back
        </Button>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary.light + '20' }]}>
            <Icon name="lock-reset" size={48} color={colors.primary.main} />
          </View>
          <Text style={[styles.title, { color: colors.text.primary }]}>Forgot Password?</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            Enter your email address and we'll send you instructions to reset your password.
          </Text>
        </View>

        {/* Form */}
        <View style={[styles.form, { backgroundColor: colors.surface.default }]}>
          <FormInput
            name="email"
            control={control}
            label="Email Address"
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="email-outline"
          />

          <Button
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            fullWidth
            size="large"
          >
            Send Reset Instructions
          </Button>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.text.secondary }]}>Remember your password?</Text>
          <Button
            variant="text"
            onPress={() => navigation.navigate('Login')}
          >
            Sign In
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
  },
  backButtonTop: {
    alignSelf: 'flex-start',
    marginBottom: spacing[4],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing[4],
  },
  form: {
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[6],
  },
  footerText: {
    fontSize: 14,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing[3],
  },
  successMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing[6],
  },
  emailText: {
    fontWeight: '600',
  },
  backButton: {
    marginBottom: spacing[3],
    width: '100%',
  },
});
