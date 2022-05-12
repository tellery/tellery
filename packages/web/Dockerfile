FROM node:16
ENV TZ Asia/Shanghai
RUN curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm
WORKDIR /tellery-web

COPY pnpm-lock.yaml ./
RUN pnpm fetch

COPY package.json  ./
RUN pnpm install
COPY . .
RUN pnpm build
ENTRYPOINT ["npm", "run"]
CMD ["start"]