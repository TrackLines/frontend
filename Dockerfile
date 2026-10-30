FROM oven/bun:1.4.4 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.4.4 AS build
WORKDIR /app
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
ARG NEXT_PUBLIC_FLAGS_PROJECT_ID
ARG NEXT_PUBLIC_FLAGS_AGENT_ID
ARG NEXT_PUBLIC_FLAGS_ENV_ID
ENV NEXT_PUBLIC_FLAGS_PROJECT_ID=${NEXT_PUBLIC_FLAGS_PROJECT_ID} NEXT_PUBLIC_FLAGS_AGENT_ID=${NEXT_PUBLIC_FLAGS_AGENT_ID} NEXT_PUBLIC_FLAGS_ENV_ID=${NEXT_PUBLIC_FLAGS_ENV_ID}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:1.4.4 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
# Next writes optimised images and prerenders here, and the copies above are root's
RUN mkdir -p .next/cache && chown -R bun:bun .next/cache
USER bun
CMD ["bun", "server.js"]
