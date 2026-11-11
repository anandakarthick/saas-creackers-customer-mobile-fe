import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/**
 * Navigate to any screen from outside React components (e.g. notification handlers).
 * Waits until the navigator is ready before dispatching.
 */
export function navigateFromOutside(name: string, params?: Record<string, any>) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.navigate({ name, params }),
    );
  } else {
    // Queue until ready
    const unsubscribe = navigationRef.addListener('state', () => {
      if (navigationRef.isReady()) {
        navigationRef.dispatch(
          CommonActions.navigate({ name, params }),
        );
        unsubscribe();
      }
    });
  }
}
