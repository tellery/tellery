FROM node:16
ENV TZ Asia/Shanghai
WORKDIR /tellery-web

COPY package.json  ./
COPY yarn.lock ./
RUN yarn install

COPY . .
RUN pnpm build
ENTRYPOINT ["npm", "run"]
CMD ["start"]