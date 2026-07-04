# Use lightweight Node.js base image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies (exclude development packages if any)
RUN npm ci --omit=dev

# Copy source code and default env template
COPY bridge.js ./
COPY .env.example .env

# Command to run the application
CMD [ "npm", "start" ]
