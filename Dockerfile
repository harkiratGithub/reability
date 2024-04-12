# Name the node stage "build"
FROM node:12.18.2
# AS build
# Set working directory
WORKDIR /app


#EXPOSE 3000
# Copy all files from current directory to working dir in image
COPY . .
# install node modules and build assets

# Install dependencies
#RUN npm install
#RUN cd client
#RUN npm install
#RUN cd ..

# Copy the rest of the application code


# Build the React app
#RUN npm run start:development

# Stage 2: Serve the app using Nginx
#FROM nginx:alpine

#COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy the build output from Stage 1 to Nginx's web root directory
#COPY --from=builder /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
#CMD ["nginx", "-g", "daemon off;"]
ENTRYPOINT [ "/bin/sh", "/app/script.sh" ]
