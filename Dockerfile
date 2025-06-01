FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
RUN npm install -g expo-cli 
COPY package*.json ./

# Install dependencies
RUN npm install --frozen-lockfile

# Copy the rest of your application files
COPY . .
RUN npx expo install expo-dev-client
RUN npm install --global @expo/ngrok@^4.1.0
ENV PORT=8081
EXPOSE 19000 19001 19002 8081
CMD sh -c "npx expo start --tunnel --clear --go"
