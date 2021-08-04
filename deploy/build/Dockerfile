ARG GA_ID
FROM node:14.17.1-slim as api-builder
ENV TZ Asia/Shanghai
WORKDIR /app/tellery-api
COPY packages/api/package.json .
COPY packages/api/package-lock.json .
RUN npm ci
COPY packages/api .
COPY packages/protobufs /app/protobufs
RUN npm run compile

FROM node:16.4.1-alpine as web-builder
WORKDIR /app/tellery-web
COPY packages/web/package.json .
COPY packages/web/yarn.lock .
RUN yarn install --frozen-lockfile
COPY packages/web .
ENV VITE_GOOGLE_ANALYTICS_4_ID=$GA_ID
RUN yarn build

FROM node:14.17.1-alpine
WORKDIR /tellery
COPY --from=api-builder /app/tellery-api/package.json .
COPY --from=api-builder /app/tellery-api/package-lock.json .
RUN npm ci --production
COPY --from=api-builder /app/tellery-api/dist dist
COPY --from=api-builder /app/tellery-api/config config
COPY --from=web-builder /app/tellery-web/dist dist/src/assets/web
ENTRYPOINT ["npm", "run"]
CMD ["start"]
