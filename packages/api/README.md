# API

## Development

All configuration information is in the [config](./config) folder

### Prerequisites

- [Nvm](https://github.com/nvm-sh/nvm)
- Postgresql 10.0+

### Preparement

```shell
# install node
nvm install 14.16.0

# use versioned node
nvm use
```

### Run Tests

```shell
# init
npm run test:init
# execute unit test cases
npm run test
```

### Start Server Locally

```shell
npm run dev
```

Note: Developing on your own database, you can initialize it by run:

```shell
npm run compile
NODE_ENV=dev npm run typeorm schema:sync
NODE_ENV=dev npm run typeorm migration:run
```

For more details, see this [documentation](./docs)
