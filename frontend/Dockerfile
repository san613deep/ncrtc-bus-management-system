FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests first (layer caching)
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

EXPOSE 3000

# Development mode with hot reload
CMD ["npm", "run", "dev"]
