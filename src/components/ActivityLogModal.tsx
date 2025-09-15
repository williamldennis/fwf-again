import React, { useState, useEffect, useCallback } from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
// @ts-ignore
import { DateTime } from "luxon";
import { ActivityService, GardenActivity } from "../services/activityService";

interface ActivityLogModalProps {
    visible: boolean;
    onClose: () => void;
    currentUserId: string;
    activities: GardenActivity[];
    setActivities: React.Dispatch<React.SetStateAction<GardenActivity[]>>;
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({
    visible,
    onClose,
    currentUserId,
    activities,
    setActivities,
}) => {
    // may want to pass activities/setActivities from home for bell badge
    // const [activities, setActivities] = useState<GardenActivity[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Load activities
    const loadActivities = useCallback(
        async (page: number = 0, append: boolean = false) => {
            if (page === 0) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }
            setError(null);

            console.log(
                "[ActivityLogModal] 🔍 Loading activities for user:",
                currentUserId,
                "page:",
                page
            );

            try {
                const result = await ActivityService.getGardenActivities(
                    currentUserId,
                    page
                );

                console.log("[ActivityLogModal] 📊 Activity result:", {
                    success: result.success,
                    activitiesCount: result.activities?.length || 0,
                    hasMore: result.hasMore,
                    error: result.error,
                });

                // if (result.activities && result.activities.length > 0) {
                //     console.log(
                //         "[ActivityLogModal] 📋 Activities data:",
                //         result.activities.map((a) => ({
                //             id: a.id,
                //             activity_type: a.activity_type,
                //             plant_name: a.plant_name,
                //             actor_name: a.actor_name,
                //             garden_owner_name: a.garden_owner_name,
                //             created_at: a.created_at,
                //             actor_id: a.actor_id,
                //             garden_owner_id: a.garden_owner_id,
                //         }))
                //     );
                // }

                if (result.success && result.activities) {
                    if (append) {
                        setActivities((prev) => [
                            ...prev,
                            ...result.activities!,
                        ]);
                    } else {
                        setActivities(result.activities);
                    }
                    setHasMore(result.hasMore || false);
                    setCurrentPage(page);
                } else {
                    setError(result.error || "Failed to load activities");
                }
            } catch (err) {
                setError("An unexpected error occurred");
                console.error(
                    "[ActivityLogModal] Error loading activities:",
                    err
                );
            } finally {
                setLoading(false);
                setLoadingMore(false);
                setRefreshing(false);
            }
        },
        [currentUserId]
    );

    // Load more activities
    const loadMore = useCallback(() => {
        if (!loadingMore && hasMore) {
            loadActivities(currentPage + 1, true);
        }
    }, [loadingMore, hasMore, currentPage, loadActivities]);

    // Refresh activities
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadActivities(0, false);
    }, [loadActivities]);

    // Handle new activity from real-time subscription
    const handleNewActivity = useCallback((newActivity: GardenActivity) => {
        setActivities((prev) => [newActivity, ...prev]);
    }, []);

    // Update last_checked_activity_at for user
    useEffect(() => {
        const updateLastChecked = async () => {
            if (!visible || !currentUserId) return;
            await ActivityService.setLastCheckedActivityAt(currentUserId);
        }
        updateLastChecked();
    }, [visible, currentUserId]);

    // Load initial data
    useEffect(() => {
        if (visible && currentUserId) {
            loadActivities(0, false);
        }
    }, [visible, currentUserId, loadActivities]);

    // Set up real-time subscription
    useEffect(() => {
        if (visible && currentUserId) {
            const subscription = ActivityService.subscribeToActivities(
                currentUserId,
                handleNewActivity
            );

            return () => {
                ActivityService.unsubscribeFromActivities(currentUserId);
            };
        }
    }, [visible, currentUserId, handleNewActivity]);

    // Handle close
    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
            // Ignore haptic errors
        });
        onClose();
    };

    // Format activity message
    const formatActivityMessage = (activity: GardenActivity) => {
        const isOwnActivity = activity.actor_id === currentUserId;
        const isOwnGarden = activity.garden_owner_id === currentUserId;

        switch (activity.activity_type) {
            case "planted":
                if (isOwnActivity) {
                    return `You planted a ${activity.plant_name}`;
                } else {
                    return `${activity.actor_name} planted a ${activity.plant_name}`;
                }
            case "harvested":
                if (isOwnActivity) {
                    return `You harvested ${activity.plant_name}`;
                } else {
                    return `${activity.actor_name} harvested your ${activity.plant_name}`;
                }
            default:
                return "Unknown activity";
        }
    };

    // Format garden context
    const formatGardenContext = (activity: GardenActivity) => {
        const isOwnGarden = activity.garden_owner_id === currentUserId;

        if (isOwnGarden) {
            return "Your garden";
        } else {
            // Use the garden owner's name if available
            return `${activity.garden_owner_name || "friend"}'s garden`;
        }
    };

    // Format timestamp
    const formatTimestamp = (timestamp: string) => {
        const date = DateTime.fromISO(timestamp, { zone: "utc" });
        const now = DateTime.now();
        const diffMinutes = now.diff(date, "minutes").minutes;
        const diffHours = now.diff(date, "hours").hours;
        const diffDays = now.diff(date, "days").days;

        // Handle very recent activities (within 1 minute)
        if (diffMinutes < 1) {
            return "just now";
        } else if (diffMinutes < 60) {
            return `${Math.round(diffMinutes)}m ago`;
        } else if (diffHours < 24) {
            return `${Math.round(diffHours)}h ago`;
        } else {
            return `${Math.round(diffDays)}d ago`;
        }
    };

    // Get plant image for mature stage
    const getPlantImage = (plantName: string) => {
        // Convert plant name to match the image mapping keys
        const plantNameLower = plantName.toLowerCase().replace(/\s+/g, "_");
        const plantImages: Record<string, any> = {
            sunflower: require("../../assets/images/plants/sunflower/mature.png"),
            mushroom: require("../../assets/images/plants/mushroom/mature.png"),
            fern: require("../../assets/images/plants/fern/mature.png"),
            cactus: require("../../assets/images/plants/cactus/mature.png"),
            water_lily: require("../../assets/images/plants/water_lily/mature.png"),
            pine_tree: require("../../assets/images/plants/pine_tree/mature.png"),
        };

        return (
            plantImages[plantNameLower] ||
            require("../../assets/images/plants/dirt.png")
        );
    };

    // Render activity item
    const renderActivityItem = ({ item }: { item: GardenActivity }) => {
        const isOwnActivity = item.actor_id === currentUserId;

        return (
            <View style={styles.activityItem}>
                <View style={styles.activityContent}>
                    <Text style={styles.activityMessage}>
                        {formatActivityMessage(item)}
                    </Text>
                    <Text style={styles.activityGardenContext}>
                        {formatGardenContext(item)} -{" "}
                        {formatTimestamp(item.created_at)}
                    </Text>
                </View>
                <View style={styles.activityIcon}>
                    <Image
                        source={getPlantImage(item.plant_name)}
                        style={styles.activityPlantImage}
                        contentFit="contain"
                    />
                </View>
            </View>
        );
    };

    // Render loading footer
    const renderFooter = () => {
        if (!loadingMore) return null;

        return (
            <View style={styles.loadingFooter}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Loading more...</Text>
            </View>
        );
    };

    // Render empty state
    const renderEmptyState = () => {
        if (loading) return null;

        return (
            <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>🔔</Text>
                <Text style={styles.emptyStateTitle}>No activities yet</Text>
                <Text style={styles.emptyStateMessage}>
                    Plant some seeds or have friends visit your garden to see
                    activities here!
                </Text>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Garden Activity Log</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleClose}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        {error ? (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{error}</Text>
                                <TouchableOpacity
                                    style={styles.retryButton}
                                    onPress={() => loadActivities(0, false)}
                                >
                                    <Text style={styles.retryButtonText}>
                                        Retry
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <FlatList
                                data={activities}
                                renderItem={renderActivityItem}
                                keyExtractor={(item) => item.id}
                                style={styles.activityList}
                                contentContainerStyle={
                                    styles.activityListContent
                                }
                                refreshControl={
                                    <RefreshControl
                                        refreshing={refreshing}
                                        onRefresh={onRefresh}
                                        tintColor="#007AFF"
                                    />
                                }
                                onEndReached={loadMore}
                                onEndReachedThreshold={0.1}
                                ListFooterComponent={renderFooter}
                                ListEmptyComponent={renderEmptyState}
                                showsVerticalScrollIndicator={false}
                            />
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    container: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "80%",
        minHeight: "65%",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E5E5",
    },
    title: {
        fontSize: 20,
        fontWeight: "600",
        color: "#1A1A1A",
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#F5F5F5",
        alignItems: "center",
        justifyContent: "center",
    },
    closeButtonText: {
        fontSize: 18,
        color: "#666",
        fontWeight: "500",
    },
    content: {
        flex: 1,
    },
    activityList: {
        flex: 1,
    },
    activityListContent: {
        paddingBottom: 20,
    },
    activityItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F5F5F5",
    },
    activityContent: {
        flex: 1,
        marginRight: 12,
    },
    activityMessage: {
        fontSize: 16,
        color: "#1A1A1A",
        marginBottom: 4,
        lineHeight: 22,
    },
    activityTime: {
        fontSize: 14,
        color: "#666",
    },
    activityGardenContext: {
        fontSize: 14,
        color: "#666",
        fontStyle: "italic",
    },
    activityIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    activityPlantImage: {
        width: 70,
        height: 70,
        marginTop: -24,
    },
    activityIconText: {
        fontSize: 18,
    },
    loadingFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 20,
    },
    loadingText: {
        marginLeft: 8,
        fontSize: 14,
        color: "#666",
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyStateIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1A1A1A",
        marginBottom: 8,
        textAlign: "center",
    },
    emptyStateMessage: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
        lineHeight: 20,
    },
    errorContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    errorText: {
        fontSize: 16,
        color: "#FF3B30",
        textAlign: "center",
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: "#007AFF",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "500",
    },
});

export default ActivityLogModal;
