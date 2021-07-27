# Update Database Schema

If you need to change the structure of an entity during the development process, you can create a new `migration script` to synchronize the changes to the database.

The following is the command to create the migration script.

`node ./node_modules/typeorm/cli.js -f dist/ormconfig.js migrations:create --name $NAME -d src/migrations`

This command will create a `timestamp-$NAME.ts` file in the `src/migrations` folder.

You can refer to [this document](https://typeorm.io/#/migrations/creating-a-new-migration) to implement the change that needs to be updated to the database.

Then synchronize the changes to the database by executing

`npm run typeorm migration:run`
