FROM ghcr.io/pocketbase/pocketbase:latest

# Create data directory
RUN mkdir -p /pb/pb_data

# Ship server-side hooks (garden-activity push notifications, etc.)
COPY pb_hooks /pb/pb_hooks

# Expose the default PocketBase port
EXPOSE 8080

# Start PocketBase
ENTRYPOINT ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080", "--dir=/pb/pb_data", "--hooksDir=/pb/pb_hooks"]
