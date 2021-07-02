FROM nginx:1.15.7-alpine
ENTRYPOINT ["nginx", "-g", "daemon off;"]
WORKDIR /app
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY ./dist/ /app
