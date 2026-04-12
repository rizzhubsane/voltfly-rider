import { View, Text, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { Colors, Font } from '@/lib/theme';

interface KYCProgressBarProps {
  currentStep: number;
  totalSteps?: number;
}

const STEP_LABELS = ['Personal', 'Documents', 'Upload', 'Address', 'References'];

export default function KYCProgressBar({ currentStep, totalSteps = 5 }: KYCProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100;
  const animWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: progress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={{ marginBottom: 28 }}>
      {/* Step indicators */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          return (
            <View key={i} style={{ alignItems: 'center', flex: 1 }}>
              <View style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: isCompleted ? Colors.primary : isActive ? Colors.primary : Colors.borderLight,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 4,
              }}>
                {isCompleted ? (
                  <Text style={{ fontSize: 12, color: Colors.white, fontWeight: '700' }}>✓</Text>
                ) : (
                  <Text style={{
                    fontFamily: Font.semibold, fontSize: 11,
                    color: isActive ? Colors.white : Colors.textLight,
                  }}>
                    {stepNum}
                  </Text>
                )}
              </View>
              <Text style={{
                fontFamily: isActive ? Font.semibold : Font.regular,
                fontSize: 10,
                color: isActive ? Colors.primary : isCompleted ? Colors.textMuted : Colors.textLight,
                textAlign: 'center',
              }}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Progress bar */}
      <View style={{
        height: 4, borderRadius: 2,
        backgroundColor: Colors.borderLight,
        overflow: 'hidden',
      }}>
        <Animated.View
          style={{
            height: '100%', borderRadius: 2,
            backgroundColor: Colors.primary,
            width: animWidth.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
          }}
        />
      </View>

      {/* Step label */}
      <Text style={{
        fontFamily: Font.medium, fontSize: 12,
        color: Colors.textMuted, marginTop: 8,
        textAlign: 'right',
      }}>
        Step {currentStep} of {totalSteps}
      </Text>
    </View>
  );
}
