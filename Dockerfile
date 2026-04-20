FROM ghcr.io/pocketbase/pocketbase:latest

# Create data directory
RUN mkdir -p /pb/pb_data

# Expose the default PocketBase port
EXPOSE 8080

# Start PocketBase
ENTRYPOINT ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080", "--dir=/pb/pb_data"]
