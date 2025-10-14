# ---------- Stage 1: Build ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy only package files first (for efficient caching)
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all source code
COPY . .

# Build Angular app (development build)
RUN  npm run build -- petmanagement --configuration=development

# ---------- Stage 2: Run ----------
FROM node:20-alpine

WORKDIR /app

# Copy only the package files and install production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built app from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 4000

# Start Angular SSR (Server-Side Rendering)
CMD ["npm", "run", "serve:ssr:petmanagement"]

