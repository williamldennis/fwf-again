import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    ErrorBoundaryState
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error);
        console.error("Error info:", errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View
                    style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                        padding: 20,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 18,
                            fontWeight: "bold",
                            marginBottom: 10,
                        }}
                    >
                        Something went wrong
                    </Text>
                    <Text
                        style={{
                            fontSize: 14,
                            color: "#666",
                            marginBottom: 20,
                            textAlign: "center",
                        }}
                    >
                        {this.state.error?.message}
                    </Text>
                    <TouchableOpacity
                        onPress={() => this.setState({ hasError: false })}
                        style={{
                            backgroundColor: "#007AFF",
                            paddingHorizontal: 20,
                            paddingVertical: 10,
                            borderRadius: 8,
                        }}
                    >
                        <Text style={{ color: "white", fontWeight: "bold" }}>
                            Try Again
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}
