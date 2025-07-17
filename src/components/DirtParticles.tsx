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
        if (visible) {
            animationCompleteCount.current = 0;
            particles.current = Array.from({ length: 12 }, (_, index) => ({
                id: index,
                x: potPosition.x,
                y: potPosition.y,
                scale: 1.2 + Math.random() * 0.8, // 1.2 to 2.0 - bigger particles
                opacity: 1,
                rotation: Math.random() * 360,
            }));

            // Force a re-render to ensure particles are visible
            setForceUpdate((prev: number) => prev + 1);
        }
    }, [visible, potPosition]);

    const handleParticleComplete = () => {
        animationCompleteCount.current++;
        if (animationCompleteCount.current >= 12 && onAnimationComplete) {
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
        // Reset animation values
        translateX.value = 0;
        translateY.value = 0;
        scale.value = particle.scale;
        opacity.value = 1;
        rotation.value = particle.rotation;

        // Fountain-like spray effect - shoot UP and OUT from the pot position
        // Start with upward velocity (much stronger now)
        const upwardVelocity = 150 + Math.random() * 120; // 150-270 pixels up

        // Add horizontal spread for the "out" part
        const horizontalVelocity = (Math.random() - 0.5) * 80; // ±40 pixels left/right

        // Calculate final positions relative to the pot
        const finalTargetX = horizontalVelocity;
        const finalTargetY = -upwardVelocity; // Negative = upward from pot position

        // Animate with delay for staggered effect
        const delay = Math.random() * 150; // 0 to 150ms delay

        // X movement (horizontal spread)
        translateX.value = withDelay(
            delay,
            withTiming(finalTargetX, {
                duration: 1800,
                easing: Easing.out(Easing.quad),
            })
        );

        // Y movement - shoot UP first, then fall down
        // Create a sequence: up then down
        const shootUpDistance = -upwardVelocity; // Negative = UP
        const fallDownDistance = Math.abs(shootUpDistance) + 100; // Fall further than the peak

        // Use sequence to go up then down
        translateY.value = withDelay(
            delay,
            withTiming(
                shootUpDistance,
                {
                    duration: 800,
                    easing: Easing.out(Easing.quad),
                },
                () => {
                    // After going up, fall down
                    translateY.value = withTiming(fallDownDistance, {
                        duration: 1000,
                        easing: Easing.in(Easing.quad),
                    });
                }
            )
        );

        // Fade out gradually
        opacity.value = withDelay(
            delay + 1200,
            withTiming(
                0,
                {
                    duration: 600,
                    easing: Easing.out(Easing.quad),
                },
                () => {
                    runOnJS(onComplete)();
                }
            )
        );

        // Scale down as it falls
        scale.value = withDelay(
            delay + 900,
            withTiming(particle.scale * 0.3, {
                duration: 900,
                easing: Easing.in(Easing.quad),
            })
        );

        // Rotate continuously
        rotation.value = withDelay(
            delay,
            withTiming(particle.rotation + 360, {
                duration: 1800,
                easing: Easing.linear,
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

    // Adjust for container offset - particles should start at pot position
    const adjustedX = particle.x + 50; // Account for left: -50px container offset
    const adjustedY = particle.y + 340; // Account for top: -300px container offset and adjust for pot position

    return (
        <Animated.View
            style={[
                styles.particle,
                {
                    left: adjustedX,
                    top: adjustedY,
                },
                animatedStyle,
            ]}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: -300, // Allow particles to go 300px above the container
        left: -50, // Allow particles to go 50px left of the container
        right: -50, // Allow particles to go 50px right of the container
        bottom: 300, // Allow particles to go 300px below the container
        pointerEvents: "none",
    },
    particle: {
        position: "absolute",
        width: 10,
        height: 10,
        backgroundColor: "#281307", // Saddle brown color for dirt
        borderRadius: 5,
        // Add some texture with a darker center
        shadowColor: "#654321",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
        elevation: 4,
        // Add a subtle border for more definition
        borderWidth: 1,
        borderColor: "#1E1002",
    },
});

export default DirtParticles;
