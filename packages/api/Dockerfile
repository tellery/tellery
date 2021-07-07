FROM node:14.17.1-slim
ENV TZ Asia/Shanghai
WORKDIR /tellery-api
COPY package.json .
COPY package-lock.json .
RUN npm ci --production
COPY dist dist
COPY config config
ENTRYPOINT ["npm", "run"]
CMD ["start"]