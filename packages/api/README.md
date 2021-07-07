# API

## Development

All configuration information is in the [config](./config) folder

### Prerequisites

- Node v14.0+
- Postgresql 10.0+

### Run Tests

```shell
# init
npm run test:init
# execute unit test
npm run test
```

### Start Server Locally

```shell
npm run dev
```

Note: Developing on your own database, you can initialize it by run:

```shell
NODE_ENV=dev npm run typeorm schema:sync
NODE_ENV=dev npm run typeorm migration:run
```
