# Tellery Connector

## Deployment

1. mount your own profile file (see example) to `/usr/app/profiles.json`

2. If there is any third-party / community-supported connectors, put its jar into a folder and mount it to `/usr/app/extra`

3. start the container and enjoy!

## Development

### Bring your own profiles

The default working directory is `$rootProject.workingDir`, so you can put your own `profiles.json` right in this folder.

If you want to specify the profile path, you can override it by enviroment variable `PROFILE_PATH` (it should be a path **relative** to the working dir).

If you wanna test on third-party connector, put jars into `workingDir/extra`.

Then you can go with `gradle run`, everything will be all set.
