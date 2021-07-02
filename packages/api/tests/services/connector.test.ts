import test from 'ava'
import { getRepository } from 'typeorm'

import { FakeManager } from '../../src/clients/connector/fake'
import { createDatabaseCon } from '../../src/clients/db/orm'
import { FakePermission } from '../../src/core/permission'
import { ConnectorEntity } from '../../src/entities/connector'
import { ConnectorService } from '../../src/services/connector'
import { AuthType } from '../../src/types/auth'

const connectorService = new ConnectorService(new FakePermission())

test.before(async () => {
  await createDatabaseCon()
})

test('addConnector', async (t) => {
  const cert =
    '-----BEGIN CERTIFICATE-----\nMIIC5TCCAc2gAwIBAgIJAIibsx2BtA7QMA0GCSqGSIb3DQEBCwUAMBQxEjAQBgNV\nBAMMCWxvY2FsaG9zdDAeFw0yMDEyMTQwOTE2MjJaFw0yMTAxMTMwOTE2MjJaMBQx\nEjAQBgNVBAMMCWxvY2FsaG9zdDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoC\nggEBALxfX+j9cTEAks4foGH13tpFHjuLKz412345678yphUPAwrNNqbebthmat5\nmadcbtseakliDvQ3FSqXKVJRK45Q/Y4gcNep47Fx1kK2jpCVs43wQJ9Zwc0NzsGF\nLu70JZRapJzY+0R4kytuOEu2kZS2AbZMj6L52bHm0d9trqN31x82w8mP6GtE1C+0\n4irszq5jdlVxBk12345678nFF0rr8bYgWEylixWQD+Q8YtqhvQwpPq27zMhO3oe\nIpxuBfXYX89h8y+Cw7OwPS1lLPH+IhllYCNpV/Kw8K9b4a62ERkHgYP/W6XQMbBa\nsZC/SVfQx7ZomRR4NyAPvjTjsP0CAwEAAaM6MDgwFAYDVR0RBA0wC4IJbG9jYWxo\nb3N0MAsGA1UdDwQEAwIHgDATBgNVHSUEDDAKBggrBgEFBQcDATANBgkqhkiG9w0B\nAQsFAAOCAQEAOzFDlU0YXwlyDtaeTOSczrEhQ8alWc9ixIcA1d+nJS9TVe4a9TOZ\nj+GlVV4i1ENY+OHxNNQJN6eCBiuc93nHrgBDTR60ftL86SsH+mBgCs1nYCLJxL2G\ns90HSPPviCcV/gB2Xuz8c59voCZ+vPy+S1TucMqtCl9ItDAZlgHiDcVEIuNrlSCC\nmkLPZec7zTCsiyQkYpmnC41TmQFhzsscIoWy1etf+OKueLu/YVDP9jIaDMYBEeGT\ngxQkiSbt8sSQQw565npBve8J7ngm3AsLROb6b6dOt9OjTmi+VjHaJsF62NVHJfPr\ntUcvNmSTcr9oXhlAxIHoGieiY3SjMhN1Ng==\n-----END CERTIFICATE-----\n'
  const url = 'http://test.com'
  const id = await connectorService.addConnector(() => new FakeManager(), '', '', {
    url,
    authType: AuthType.TLS,
    authData: {
      cert,
    },
    name: 'test',
  })

  const model = await getRepository(ConnectorEntity).findOne(id)

  t.deepEqual(model?.authData.cert, cert)
  t.deepEqual(model?.url, url)
  await getRepository(ConnectorEntity).delete(id)
})
