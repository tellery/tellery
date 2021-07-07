# Using Docker Compose

Setup Tellery quickly using docker compose.

## Prerequisites

- [Docker Compose](https://docs.docker.com/compose/install/) +v1.28
- 3GB of free memory
- 5GB of disk space

## Set up

Open your terminal, and run:

```shell
git clone https://github.com/tellery/tellery.git
cd tellery/hack/compose
docker-compose up
```

Now you can access Tellery by visiting `http://localhost:8000`

## Environments

| Parameter                    | Description                                                | Default                  |
| ---------------------------- | ---------------------------------------------------------- | ------------------------ |
| TELLERY_SERVER_IMAGE         | Server image name                                          | tellery/tellery:latest   |
| TELLERY_CONNECTOR_IMAGE      | Connector server image name                                | tellery/connector:latest |
| POSTGRES_USERNAME            | Postgresql username                                        | tellery                  |
| POSTGRES_PASSWORD            | Postgresql password                                        | ZMnyXaVYm8ItOv+vhoh07Q   |
| POSTGRES_DB                  | Postgresql database name                                   | tellery                  |
| SERVER_PROTO                 | Web server protocol                                        | http                     |
| SERVER_HOST                  | Web server host                                            | localhost                |
| SECRET_KEY                   | Secret key for encrypt sensitive information into database | pjfJ2Cbe3sv0Gtz32Krr4A   |
| EMAIL_USE_TLS                | Enable TLS                                                 | false                    |
| EMAIL_USERNAME               | Mail server username                                       | ""                       |
| EMAIL_PASSWORD               | Mail server password                                       | ""                       |
| EMAIL_PORT                   | Mail server port                                           | 587                      |
| EMAIL_HOST                   | Mail server host                                           | ""                       |
| EMAIL_FROM                   | System mail sender's email address                         | ""                       |
| CREATE_USER_EMAIL            | Email of default user                                      | admin@tellery.local      |
| CREATE_USER_NAME             | Name of default user                                       | admin                    |
| CREATE_USER_PASSWORD         | Password of default user                                   | ognThIrfzRDhSQcg8lQrdg   |

Then you can modify the configuration by modifying the variables in the [.env](https://github.com/tellery/tellery/blob/master/hack/compose/.env) or specifying the environment variable at startup.

```shell
POSTGRES_USERNAME=tellery docker-compose up
```
