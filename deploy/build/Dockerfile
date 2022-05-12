FROM node:16.4.1-slim as api-builder
ENV TZ Asia/Shanghai
WORKDIR /app/tellery-api
RUN curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm
COPY packages/api/package.json .
COPY packages/api/pnpm-lock.yaml .
RUN pnpm install 
COPY packages/api .
COPY packages/protobufs /app/protobufs
RUN npm run compile

FROM node:16.4.1-alpine as web-builder
WORKDIR /app/tellery-web
RUN curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm
COPY packages/web/package.json .
COPY packages/web/pnpm-lock.yaml .
RUN pnpm install --frozen-lockfile
COPY packages/web .
RUN pnpm build

FROM node:16.4.1-alpine
WORKDIR /tellery
COPY --from=api-builder /app/tellery-api/package.json .
COPY --from=api-builder /app/tellery-api/pnpm-lock.yaml .
RUN pnpm install -r --prod
COPY --from=api-builder /app/tellery-api/dist dist
COPY --from=api-builder /app/tellery-api/config config
COPY --from=web-builder /app/tellery-web/dist dist/src/assets/web
ENTRYPOINT ["npm", "run"]
CMD ["start"]
