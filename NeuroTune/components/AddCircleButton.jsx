import React, { useRef } from 'react';
import { Animated, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AddCircleButton = ({ isAdded = false, onPress, size = 36 }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (onPress) onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handlePress}
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <Ionicons
          name={isAdded ? 'checkmark' : 'add'}
          size={size * 0.6}
          color={isAdded ? '#1DB954' : '#fff'}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'transparent', // make background transparent
    justifyContent: 'center',
    alignItems: 'center',
    // optionally keep shadow or border
    // if you want some outline:
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    // remove elevation if it's causing clipping issues with transparency on Android
    elevation: 0,
    // optional shadow on iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
});

export default AddCircleButton;
