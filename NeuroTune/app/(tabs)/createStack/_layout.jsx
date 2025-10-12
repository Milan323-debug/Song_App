import React from 'react';
import { Stack } from 'expo-router';
import COLORS from '../../../constants/colors';

export default function Layout() {
  // nested stack under (tabs) so the tab bar remains visible
  // set default background color for screens to avoid white flash
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    />
  );
}
