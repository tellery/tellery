#!/bin/sh

port=5432
db=tellery

echo "starting docker container ..."
container_id=$(docker run --name tellery_local_test -e POSTGRES_PASSWORD=root -e POSTGRES_DB=$db -p $port:5432 -d chenxinaz/zhparser:10.2)
echo "docekr container $container_id is started"

if [ $? != 0 ]; then
	exit $?
fi

export NODE_ENV=test
export PG_HOST=localhost
export PG_PORT=$port
export PG_USERNAME=postgres
export PG_PASSWORD=root
export PG_DATABASE=$db
npm run compile
npm run typeorm schema:sync
npm run typeorm migration:run
