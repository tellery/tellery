#!/bin/sh
cat <<EOF > /usr/app/profiles.json
{
    "profiles": [{
    "type": "PostgreSQL",
    "name": "default",
    "configs": {
        "Endpoint": "postgresql",
        "Port": "5432",
        "Database": "sample",
        "Username": "${POSTGRES_USERNAME}",
        "Password": "${POSTGRES_PASSWORD}"
      }
    }
  ]
}
EOF