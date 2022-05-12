FROM node:16 AS pnpm-installed
RUN curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm

FROM pnpm-installed as api-builder
ENV TZ Asia/Shanghai
WORKDIR /app/tellery-api
COPY packages/api/pnpm-lock.yaml .
RUN pnpm fetch
COPY packages/api/package.json .
RUN pnpm install -r 
COPY packages/api .
COPY packages/protobufs /app/protobufs
RUN npm run compile

FROM pnpm-installed as web-builder
WORKDIR /app/tellery-web
COPY packages/web/pnpm-lock.yaml .
RUN pnpm fetch
COPY packages/web/package.json .
RUN pnpm install -r
COPY packages/web .
RUN pnpm build

FROM pnpm-installed
WORKDIR /tellery
COPY --from=api-builder /app/tellery-api/pnpm-lock.yaml .
RUN pnpm fetch
COPY --from=api-builder /app/tellery-api/package.json .
RUN pnpm install -r  --prod
COPY --from=api-builder /app/tellery-api/dist dist
COPY --from=api-builder /app/tellery-api/config config
COPY --from=web-builder /app/tellery-web/dist dist/src/assets/web
ENTRYPOINT ["npm", "run"]
CMD ["start"]
