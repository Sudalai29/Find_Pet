FROM alpine:3.20
RUN apk add --no-cache bash docker-cli
COPY monitor_logs.sh /usr/local/bin/monitor_logs.sh
RUN chmod +x /usr/local/bin/monitor_logs.sh
CMD ["/usr/local/bin/monitor_logs.sh"]

