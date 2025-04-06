# Use Ubuntu as the base image
FROM ubuntu:20.04

# Avoid interactive prompts during build
ARG DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    vim \
    wget \
    python3 \
    sudo \
    ca-certificates \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_14.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Create React App globally
RUN npm install -g create-react-app

# Set up a non-root user
ARG USERNAME=devuser
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Switch to the non-root user
USER $USERNAME

# Set the default shell to bash
ENV SHELL=/bin/bash

# Set the working directory
WORKDIR /home/devuser/chess-web-app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
