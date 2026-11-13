import React from 'react';
import { View, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';

interface BrandLogoProps {
  size?: 'compact' | 'medium' | 'large' | 'hero';
  style?: StyleProp<ViewStyle>;
  containerBackground?: 'transparent' | 'card' | 'elevated';
}

const SIZE_CONFIGS = {
  compact: { width: 92, height: 46 },
  medium: { width: 140, height: 70 },
  large: { width: 190, height: 95 },
  hero: { width: 250, height: 125 },
};

/**
 * Reusable HAQ Brand Logo Component
 * Strict aspect ratio (2:1) preserved from official asset (1774 x 887).
 * Never stretched, cropped, or recolored.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'medium',
  style,
  containerBackground = 'transparent',
}) => {
  const { width, height } = SIZE_CONFIGS[size];

  return (
    <View
      style={[
        styles.baseContainer,
        containerBackground === 'card' && styles.cardContainer,
        containerBackground === 'elevated' && styles.elevatedContainer,
        style,
      ]}
    >
      <Image
        source={require('../../assets/haq-logo.png')}
        style={{ width, height }}
        resizeMode="contain"
        accessible={true}
        accessibilityLabel="HAQ — आपला हक्क, तुमचा साथी"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9E5DC',
  },
  elevatedContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9E5DC',
    shadowColor: '#101A3A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
});

