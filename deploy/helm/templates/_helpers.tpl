{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "tellery.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "server.port" -}}8000{{- end -}}
{{- define "connector.port" -}}50051{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "tellery.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "server.image" -}}
{{- default "tellery/tellery" .Values.images.server.repository -}}
:
{{- default .Chart.AppVersion .Values.images.server.tag -}}
{{- end -}}
{{- define "connector.image" -}}
{{- default "tellery/connector" .Values.images.connector.repository -}}
:
{{- default .Chart.AppVersion .Values.images.connector.tag -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "tellery.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "tellery.postgresql.fullname" -}}
{{- if .Values.postgresql.fullnameOverride -}}
{{- .Values.postgresql.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.postgresql.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name "postgresql" | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Set postgres host
*/}}
{{- define "tellery.postgresql.host" -}}
{{- if .Values.postgresql.enabled -}}
{{- template "tellery.postgresql.fullname" . -}}
{{- else -}}
{{ required "A valid .Values.externalPostgresql.host is required" .Values.externalPostgresql.host }}
{{- end -}}
{{- end -}}

{{/*
Set postgres port
*/}}
{{- define "tellery.postgresql.port" -}}
{{- if .Values.postgresql.enabled -}}
{{- default 5432 .Values.postgresql.service.port }}
{{- else -}}
{{- required "A valid .Values.externalPostgresql.port is required" .Values.externalPostgresql.port -}}
{{- end -}}
{{- end -}}

{{/*
Set postgresql username
*/}}
{{- define "tellery.postgresql.username" -}}
{{- if .Values.postgresql.enabled -}}
{{- default "postgres" .Values.postgresql.postgresqlUsername }}
{{- else -}}
{{ required "A valid .Values.externalPostgresql.username is required" .Values.externalPostgresql.username }}
{{- end -}}
{{- end -}}

{{/*
Set postgresql password
*/}}
{{- define "tellery.postgresql.password" -}}
{{- if .Values.postgresql.enabled -}}
{{- default "" .Values.postgresql.postgresqlPassword }}
{{- else -}}
{{ required "A valid .Values.externalPostgresql.password is required" .Values.externalPostgresql.password }}
{{- end -}}
{{- end -}}

{{/*
Set postgresql database
*/}}
{{- define "tellery.postgresql.database" -}}
{{- if .Values.postgresql.enabled -}}
{{- default "tellery" .Values.postgresql.postgresqlDatabase }}
{{- else -}}
{{ required "A valid .Values.externalPostgresql.database is required" .Values.externalPostgresql.database }}
{{- end -}}
{{- end -}}

{{- define "tellery.redis.fullname" -}}
{{- if .Values.redis.fullnameOverride -}}
{{- .Values.redis.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.redis.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name "redis" | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Set redis host
*/}}
{{- define "tellery.redis.host" -}}
{{- if .Values.redis.enabled -}}
{{- template "tellery.redis.fullname" . -}}-master
{{- else -}}
{{ required "A valid .Values.externalRedis.host is required" .Values.externalRedis.host }}
{{- end -}}
{{- end -}}

{{/*
Set redis host
*/}}
{{- define "tellery.redis.enabled" -}}
{{- if .Values.redis.enabled -}}
true
{{- else if .Values.externalRedis.enabled -}}
true
{{- end -}}
{{- end -}}

{{/*
Set redis port
*/}}
{{- define "tellery.redis.port" -}}
{{- if .Values.redis.enabled -}}
{{- default 6379 .Values.redis.redisPort }}
{{- else -}}
{{ required "A valid .Values.externalRedis.port is required" .Values.externalRedis.port }}
{{- end -}}
{{- end -}}

{{/*
Set redis password
*/}}
{{- define "tellery.redis.password" -}}
{{- if .Values.redis.enabled -}}
{{ .Values.redis.auth.password }}
{{- else -}}
{{ .Values.externalRedis.password }}
{{- end -}}
{{- end -}}
