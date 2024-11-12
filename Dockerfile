# Use an official Node.js 12.18.2 image with Alpine Linux
FROM node:12.18.2

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire application to the working directory
COPY . .

# Run the heroku-postbuild script, including Angular build
RUN npm run heroku-postbuild

# Expose the port your app runs on
EXPOSE 3000

# Define the command to run your application
CMD ["npm", "start"]