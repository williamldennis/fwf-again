import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    runOnJS,
    Easing,
} from "react-native-reanimated";

interface DirtParticlesProps {
    visible: boolean;
    potPosition: { x: number; y: number };
    onAnimationComplete?: () => void;
}

interface Particle {
    id: number;
    x: number;
    y: number;
    scale: number;
    opacity: number;
    rotation: number;
}

export const DirtParticles: React.FC<DirtParticlesProps> = ({
    visible,
    potPosition,
    onAnimationComplete,
}) => {
    const particles = useRef<Particle[]>([]);
    const animationCompleteCount = useRef(0);
    const [forceUpdate, setForceUpdate] = useState(0);

    // Generate particles when animation starts
    useEffect(() => {
        console.log(`[DirtParticles] visible prop changed to: ${visible}`);
        if (visible) {
            console.log(
                `[DirtParticles] Creating particles at position: x=${potPosition.x}, y=${potPosition.y}`
            );
            animationCompleteCount.current = 0;
            particles.current = Array.from({ length: 8 }, (_, index) => ({
                id: index,
                x: potPosition.x,
                y: potPosition.y,
                scale: 0.8 + Math.random() * 0.4, // 0.8 to 1.2
                opacity: 1,
                rotation: Math.random() * 360,
            }));

            // Force a re-render to ensure particles are visible
            setForceUpdate((prev: number) => prev + 1);
        }
    }, [visible, potPosition]);

    const handleParticleComplete = () => {
        animationCompleteCount.current++;
        if (animationCompleteCount.current >= 8 && onAnimationComplete) {
            onAnimationComplete();
        }
    };

    if (!visible) return null;

    return (
        <View style={styles.container} pointerEvents="none">
            {particles.current.map((particle) => (
                <DirtParticle
                    key={`${particle.id}-${forceUpdate}`}
                    particle={particle}
                    onComplete={handleParticleComplete}
                />
            ))}
        </View>
    );
};

interface DirtParticleProps {
    particle: Particle;
    onComplete: () => void;
}

const DirtParticle: React.FC<DirtParticleProps> = ({
    particle,
    onComplete,
}) => {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(particle.scale);
    const opacity = useSharedValue(1);
    const rotation = useSharedValue(particle.rotation);

    useEffect(() => {
        console.log(
            `[DirtParticle] Starting animation for particle at ${particle.x}, ${particle.y}`
        );

        // Reset animation values
        translateX.value = 0;
        translateY.value = 0;
        scale.value = particle.scale;
        opacity.value = 1;
        rotation.value = particle.rotation;

        // Random direction and distance
        const angle = Math.random() * Math.PI * 2; // 0 to 2π
        const distance = 30 + Math.random() * 40; // 30 to 70 pixels
        const targetX = Math.cos(angle) * distance;
        const targetY = Math.sin(angle) * distance - 20; // Slight upward bias

        // Animate with delay for staggered effect
        const delay = Math.random() * 200; // 0 to 200ms delay

        translateX.value = withDelay(
            delay,
            withTiming(targetX, {
                duration: 1200,
                easing: Easing.out(Easing.quad),
            })
        );

        translateY.value = withDelay(
            delay,
            withTiming(targetY, {
                duration: 1200,
                easing: Easing.out(Easing.quad),
            })
        );

        // Fade out
        opacity.value = withDelay(
            delay + 400,
            withTiming(
                0,
                {
                    duration: 800,
                    easing: Easing.out(Easing.quad),
                },
                () => {
                    runOnJS(onComplete)();
                }
            )
        );

        // Slight scale down
        scale.value = withDelay(
            delay + 200,
            withTiming(particle.scale * 0.5, {
                duration: 1000,
                easing: Easing.out(Easing.quad),
            })
        );

        // Rotate
        rotation.value = withDelay(
            delay,
            withTiming(particle.rotation + 180, {
                duration: 1200,
                easing: Easing.out(Easing.quad),
            })
        );
    }, [particle.x, particle.y, particle.scale, particle.rotation]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
            { rotate: `${rotation.value}deg` },
        ],
        opacity: opacity.value,
    }));

    console.log(
        `[DirtParticle] Rendering particle at left=${particle.x}, top=${particle.y}`
    );
    return (
        <Animated.View
            style={[
                styles.particle,
                {
                    left: particle.x,
                    top: particle.y,
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
    },
    particle: {
        position: "absolute",
        width: 6,
        height: 6,
        backgroundColor: "#8B4513", // Saddle brown color for dirt
        borderRadius: 3,
        // Add some texture with a darker center
        shadowColor: "#654321",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 1,
        elevation: 2,
    },
});

export default DirtParticles;
