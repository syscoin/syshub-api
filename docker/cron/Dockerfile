FROM ghcr.io/syscoin/syshub-api:master

# Install cron and docker CLI
USER root
RUN apt-get update && \
    apt-get install -y cron docker.io && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create log directory
RUN mkdir -p /var/log && \
    chmod 755 /var/log

# Copy cron configuration
COPY docker/cron/crontab /etc/cron.d/key-rotation
COPY docker/cron/rotate-key-cron.sh /app/docker/cron/rotate-key-cron.sh

# Set permissions
RUN chmod 0644 /etc/cron.d/key-rotation && \
    chmod +x /app/docker/cron/rotate-key-cron.sh && \
    crontab /etc/cron.d/key-rotation

# Create cron log file
RUN touch /var/log/cron.log

# Start cron in foreground
CMD ["cron", "-f"]
