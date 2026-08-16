# Glama runs the server in a container and checks that it starts and answers an
# introspection request (initialize + tools/list). The server is stdio and has
# no dependencies, so the image is just Node plus two source files.
FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY src ./src

# No install step: the package has zero runtime dependencies by design.
ENV NODE_ENV=production

# stdio transport — the client speaks JSON-RPC over stdin/stdout.
ENTRYPOINT ["node", "src/server.mjs"]
