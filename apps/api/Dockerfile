# PaiPai API: production image.
# Build from the repo root:  docker build -f apps/api/Dockerfile -t paipai-api .
# Run:                       docker run --env-file .env -e NODE_ENV=production -p 8787:8787 paipai-api

FROM node:24-slim AS build
RUN npm install -g pnpm@10.34.9
WORKDIR /repo
COPY . .
# Install only the API and the workspace packages it depends on.
RUN pnpm install --frozen-lockfile --filter @paipai/api...
RUN pnpm --filter @paipai/api build
# Self-contained folder with production dependencies only.
RUN pnpm deploy --filter @paipai/api --prod --legacy /out

FROM node:24-slim
ENV NODE_ENV=production \
    PORT=8787
WORKDIR /app
COPY --from=build /out/package.json ./package.json
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/dist ./dist
COPY --from=build /out/assets ./assets
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
