import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  errorStack: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '', errorStack: '' };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || String(error) || 'Unknown error',
      errorStack: error?.stack || '',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught:', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '', errorStack: '' });
  };

  private handleClearCache = async () => {
    try {
      await AsyncStorage.removeItem('@saas/query-cache');
      this.setState({ hasError: false, errorMessage: '', errorStack: '' });
    } catch {}
  };

  render() {
    if (this.state.hasError) {
      const shortStack = this.state.errorStack
        .split('\n')
        .slice(0, 8)
        .join('\n');

      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          {this.props.label && (
            <Text style={styles.label}>Section: {this.props.label}</Text>
          )}
          <ScrollView style={styles.errorBox} contentContainerStyle={styles.errorBoxContent}>
            <Text style={styles.errorText}>{this.state.errorMessage}</Text>
            {shortStack ? (
              <Text style={styles.stackText}>{shortStack}</Text>
            ) : null}
          </ScrollView>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearButton} onPress={this.handleClearCache}>
            <Text style={styles.clearButtonText}>Clear Cache & Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F8FAFC',
  },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  label: { fontSize: 13, color: '#6366f1', marginBottom: 8, fontWeight: '600' },
  errorBox: {
    maxHeight: 200,
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 20,
  },
  errorBoxContent: {
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
    marginBottom: 6,
  },
  stackText: {
    fontSize: 10,
    color: '#991B1B',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  clearButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  clearButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
