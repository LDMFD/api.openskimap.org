# Stage 1: Build the application
FROM node:18-alpine AS builder
WORKDIR /usr/src/app

# Copy package files
COPY package.json package-lock.json* ./
# The package-lock.json might not exist initially or be out of sync.
# npm install will generate/update it and install all dependencies.
RUN npm install

# Copy source code and tsconfig
COPY tsconfig.json ./
COPY src ./src/

# Build TypeScript
RUN npm run build

# Stage 2: Production image
FROM node:18-alpine
WORKDIR /usr/src/app

# Copy package.json AND the package-lock.json generated/updated by the builder stage
COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/package-lock.json ./

# Install production dependencies using the lock file from the builder stage
RUN npm ci --omit=dev

# Copy built assets from the builder stage
COPY --from=builder /usr/src/app/dist ./dist/

# Expose the port the app runs on
# Assuming port 3000, common for Express.js apps.
# The user should verify and change if necessary.
EXPOSE 3000

# Command to run the application
CMD [ "npm", "start" ] 