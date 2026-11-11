import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ViewStyle,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native-paper';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';

interface ScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  padding?: boolean;
  safeArea?: boolean;
  safeAreaEdges?: ('top' | 'bottom' | 'left' | 'right')[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  backgroundColor?: string;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  keyboardAvoiding?: boolean;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  scrollable = true,
  padding = true,
  safeArea = true,
  safeAreaEdges = ['left', 'right'],
  loading = false,
  refreshing = false,
  onRefresh,
  backgroundColor,
  style,
  contentContainerStyle,
  keyboardAvoiding = true,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();

  const bgColor = backgroundColor || colors.background.default;

  const containerStyle = [
    styles.container,
    { backgroundColor: bgColor },
    style,
  ];

  const contentStyle = [
    padding && styles.padding,
    contentContainerStyle,
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      );
    }

    if (scrollable) {
      return (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary.main]}
                tintColor={colors.primary.main}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      );
    }

    return <View style={[styles.content, contentStyle]}>{children}</View>;
  };

  const content = (
    <>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      {renderContent()}
    </>
  );

  const wrappedContent = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.keyboardAvoiding}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  if (safeArea) {
    return (
      <SafeAreaView style={containerStyle} edges={safeAreaEdges}>
        {wrappedContent}
      </SafeAreaView>
    );
  }

  return <View style={containerStyle}>{wrappedContent}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  padding: {
    padding: spacing[4],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
