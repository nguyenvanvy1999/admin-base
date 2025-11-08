import { PrismaPg } from '@prisma/adapter-pg'
import { appEnv } from './env'
import { logger } from './logger'
import { PrismaClient } from '../generated/prisma/client'

const adapter = new PrismaPg({
	connectionString: appEnv.POSTGRES_URL,
	pool: {
		min: 2,
		max: 10,
		idleTimeoutMillis: 30000,
		acquireTimeoutMillis: 30000,
	},
})
export const prisma = new PrismaClient({
	adapter,
	log: ['error', 'warn'],
	errorFormat: 'pretty',
})

prisma.$on('error', (err) => logger.error('Prisma database error', { err }))

