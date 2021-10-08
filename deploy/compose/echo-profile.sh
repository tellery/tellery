#!/bin/sh
cat <<EOF > /usr/app/profile.json
{
  "id": "0",
  "type": "PostgreSQL",
  "configs": {
    "Endpoint": "postgresql",
    "Port": "5432",
    "Database": "sample",
    "Username": "${POSTGRES_USERNAME}",
    "Password": "${POSTGRES_PASSWORD}"
  }
}
EOF