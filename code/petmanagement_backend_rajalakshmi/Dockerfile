# Build Stage

FROM node:18-alpine AS builder

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

# RUN STAGE

FROM node:18-alpine AS runner

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/app ./app
COPY --from=builder /usr/src/app/server.js ./
COPY --from=builder /usr/src/app/.env ./
COPY --from=builder /usr/src/app/app/config/db.config.js ./app/config/db.config.js

RUN npm install --only=production
RUN chown -R appuser:appgroup /usr/src/app
USER appuser

EXPOSE 5000
CMD ["node", "server.js"]


