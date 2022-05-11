FROM node:16
ENV TZ Asia/Shanghai
RUN curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm
WORKDIR /tellery-api

COPY pnpm-lock.yaml ./
RUN pnpm fetch --prod

COPY package.json  ./
RUN pnpm install -r --prod
COPY dist dist
COPY config config
ENTRYPOINT ["npm", "run"]
CMD ["start"]