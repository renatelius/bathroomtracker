import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Плавное появление контента при монтировании: fade + лёгкий сдвиг вверх.
 * `delay` (мс) — для каскадного появления элементов списка.
 */
export default function FadeIn({ children, delay = 0, style, translateY = 14 }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.spring(progress, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 55,
      delay,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, delay]);

  return (
    <Animated.View
      style={[
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [translateY, 0],
              }),
            },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
