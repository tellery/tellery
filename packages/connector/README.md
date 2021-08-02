# Tellery Connector

## Deployment

1. mount your own profile file (see example) to `/usr/app/extra/profiles.json`

2. If there is any third-party / community-supported connectors, put its jar into a folder and mount it to `/usr/app/extra/libs`

3. start the container and enjoy!

## Development

### Bring your own profiles

The default working directory is `$rootProject.workingDir`, in gradle idea plugin it has been set to `packages/connector`, so you can put your own `profiles.json` right in `packages/connector/extra` if you start the service by idea.

If you want to specify the profile path, you can override it by enviroment variable `PROFILE_PATH` (it should be a path **relative** to the working dir).

If you wanna test on third-party connector, put jars into `packages/connector/extra/libs`.

Then you can go with `gradle run`, everything will be all set.
