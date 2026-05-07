import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withSequence,
    runOnJS,
    Easing,
} from "react-native-reanimated";

interface SparkleParticlesProps {
    visible: boolean;
    position: { x: number; y: number };
    onAnimationComplete?: () => void;
}

interface Particle {
    id: number;
    x: number;
    y: number;
    size: number;
    color: string;
    delay: number;
}

const SPARKLE_COLORS = [
    "#FFD700", // Gold
    "#FFC107", // Amber
    "#FFEB3B", // Yellow
    "#FFF176", // Light yellow
    "#FFFFFF", // White sparkle
];

export const SparkleParticles: React.FC<SparkleParticlesProps> = ({
    visible,
    position,
    onAnimationComplete,
}) => {
    const particles = useRef<Particle[]>([]);
    const animationCompleteCount = useRef(0);
    const [forceUpdate, setForceUpdate] = useState(0);

    useEffect(() => {
        if (visible) {
            animationCompleteCount.current = 0;
            // Create more particles for a fuller effect
            particles.current = Array.from({ length: 20 }, (_, index) => ({
                id: index,
                x: position.x,
                y: position.y,
                size: 4 + Math.random() * 8, // 4-12px
                color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
                delay: Math.random() * 100, // 0-100ms stagger
            }));

            setForceUpdate((prev) => prev + 1);
        }
    }, [visible, position]);

    const handleParticleComplete = () => {
        animationCompleteCount.current++;
        if (animationCompleteCount.current >= 20 && onAnimationComplete) {
            onAnimationComplete();
        }
    };

    if (!visible) return null;

    return (
        <View style={styles.container} pointerEvents="none">
            {particles.current.map((particle) => (
                <SparkleParticle
                    key={`${particle.id}-${forceUpdate}`}
                    particle={particle}
                    onComplete={handleParticleComplete}
                />
            ))}
        </View>
    );
};

interface SparkleParticleProps {
    particle: Particle;
    onComplete: () => void;
}

const SparkleParticle: React.FC<SparkleParticleProps> = ({
    particle,
    onComplete,
}) => {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);
    const rotation = useSharedValue(0);

    useEffect(() => {
        // Reset values
        translateX.value = 0;
        translateY.value = 0;
        scale.value = 0;
        opacity.value = 0;
        rotation.value = 0;

        // Random direction - burst outward in all directions
        const angle = Math.random() * Math.PI * 2; // Full circle
        const distance = 80 + Math.random() * 120; // 80-200px outward
        const finalX = Math.cos(angle) * distance;
        const finalY = Math.sin(angle) * distance - 60; // Bias upward

        const delay = particle.delay;

        // Scale: pop in, then shrink out
        scale.value = withDelay(
            delay,
            withSequence(
                withTiming(1.5, { duration: 150, easing: Easing.out(Easing.back(2)) }),
                withTiming(1, { duration: 100 }),
                withDelay(400, withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }))
            )
        );

        // Opacity: fade in quick, stay, fade out
        opacity.value = withDelay(
            delay,
            withSequence(
                withTiming(1, { duration: 100 }),
                withDelay(500, withTiming(0, { duration: 300 }, () => {
                    runOnJS(onComplete)();
                }))
            )
        );

        // Movement: burst outward
        translateX.value = withDelay(
            delay,
            withTiming(finalX, {
                duration: 800,
                easing: Easing.out(Easing.cubic),
            })
        );

        translateY.value = withDelay(
            delay,
            withTiming(finalY, {
                duration: 800,
                easing: Easing.out(Easing.cubic),
            })
        );

        // Rotation: spin as it moves
        rotation.value = withDelay(
            delay,
            withTiming(360 + Math.random() * 360, {
                duration: 800,
                easing: Easing.out(Easing.quad),
            })
        );
    }, [particle]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
            { rotate: `${rotation.value}deg` },
        ],
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                styles.particle,
                {
                    left: particle.x,
                    top: particle.y,
                    width: particle.size,
                    height: particle.size,
                    backgroundColor: particle.color,
                    borderRadius: particle.size / 2,
                },
                animatedStyle,
            ]}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        zIndex: 1000,
    },
    particle: {
        position: "absolute",
        shadowColor: "#FFD700",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 4,
    },
});

export default SparkleParticles;
