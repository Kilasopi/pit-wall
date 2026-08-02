# Build context is the repo root (see docker-compose.yml) because
# agent/websocket_server.js reaches into the sibling shared/ folder.
FROM node:22-alpine
WORKDIR /app
COPY agent/package*.json ./agent/
RUN npm --prefix agent install
COPY agent ./agent
COPY shared ./shared
WORKDIR /app/agent
EXPOSE 4100 4101
CMD ["node", "index.js"]
