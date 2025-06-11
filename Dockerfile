# Use an official Node.js 20 Alpine image
FROM node:20-alpine

# Set the working directory
WORKDIR /usr/src/app

# Disable postinstall script execution
ENV npm_config_ignore_scripts=true

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./


# Install dependencies (use --legacy-peer-deps if needed for compatibility)
RUN npm install --legacy-peer-deps 

# Copy the entire application to the working directory
COPY . .

COPY .env .env

# Run the heroku-postbuild script, including Angular build
RUN npm run heroku-postbuild

# Expose the port your app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
