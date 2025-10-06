import { View, Text } from 'react-native'
import React from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import COLORS from '../constants/colors';
import { usePathname } from 'expo-router';

export default function SafeScreen({ children}) {
    const insets = useSafeAreaInsets();
    const pathname = usePathname();
    const isAuthRoute = typeof pathname === 'string' && pathname.startsWith('/(auth)');
    // For auth screens we want the screen's own gradient to extend into the status bar area.
    const paddingTop = isAuthRoute ? 0 : insets.top;
  return (
    <View style={[styles.container, { paddingTop, backgroundColor: isAuthRoute ? 'transparent' : COLORS.background }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
});