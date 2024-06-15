# Use the UBI base image from Red Hat
FROM registry.access.redhat.com/ubi8/ubi:latest

# Install necessary packages and Node.js
RUN yum update -y && \
    yum install -y \
    git \
    vim \
    curl \
    wget \
    python3 \
    sudo \
    && curl -sL https://rpm.nodesource.com/setup_14.x | bash - && \
    yum install -y nodejs && \
    yum clean all

# Install Create React App globally
RUN npm install -g create-react-app

# Set up a non-root user (optional but recommended)
ARG USERNAME=devuser
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && mkdir -p /etc/sudoers.d \
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Switch to the non-root user
USER $USERNAME

# Set the default shell to bash
ENV SHELL /bin/bash

# Set the working directory
WORKDIR /home/devuser/chess-web-app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Expose the port that your app runs on
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
