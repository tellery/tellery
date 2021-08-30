import config from 'config'

const { host, port, username, password, database } = config.get('postgres')

const param = {
  type: 'postgres',
  host,
  port,
  username,
  password,
  database,
  maxQueryExecutionTime: 3000,
  entities: [`${__dirname}/src/entities/*.js`],
  migrations: [`${__dirname}/src/migrations/*.js`],
  subscribers: [`${__dirname}/src/subscribers/*.js`],
}

export default param
