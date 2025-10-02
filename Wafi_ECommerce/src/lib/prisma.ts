import { Prisma, PrismaClient } from "@prisma/client"
import "server-only"

/**
 * 📌 Advanced Prisma Client with Multi-DB Support
 *
 * Features:
 * - Default read from main DB
 * - Write to primary DB using `writeToPrimary: true`
 * - Proxy layer for automatic read/write routing
 * - pgBouncer connection tuning
 * - $transaction support with read/write option
 * - Health check function
 * - Graceful shutdown
 *
 * Usage:
 * import { prisma } from "./lib/prisma"
 * const products = await prisma.product.findMany()
 * const newProduct = await prisma.product.create({ data: {...}, writeToPrimary: true })
 */

/*-------------------------------
1️⃣ Environment Validation
-------------------------------*/
const validateEnvironment = () => {
  // Do not run any environment validation on the client
  if (typeof window !== "undefined") return
  const required = {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
  }

  // Ensure required environment variables exist
  Object.entries(required).forEach(([key, value]) => {
    if (!value) throw new Error(`Missing required env variable: ${key}`)
  })

  // Ensure DATABASE_URL format is correct (Postgres or MySQL)
  const dbUrl = required.DATABASE_URL!
  if (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("mysql://")) {
    throw new Error("Invalid DATABASE_URL. Must start with postgresql:// or mysql://")
  }
}
validateEnvironment()

// Server/runtime guard
const isServer = typeof window === "undefined"

/*-------------------------------
2️⃣ Prisma Client Options Creation
-------------------------------*/
const createPrismaOptions = (databaseUrl: string): Prisma.PrismaClientOptions => ({
  errorFormat: "pretty", // readable error messages
  datasources: { db: { url: databaseUrl } },
  ...(databaseUrl.includes("postgresql://") && {
    // pgBouncer compatibility: disable Prisma built-in pooling
    __internal: {
      engine: {
        connectionLimit: 1,
        pool: { min: 0, max: 1 },
      },
    },
  }),
})

/*-------------------------------
3️⃣ Type Definitions
-------------------------------*/
type WriteOptions = { writeToPrimary?: boolean }
type TransactionOptions = WriteOptions & { timeout?: number }

/*-------------------------------
4️⃣ Global Singleton for Hot-Reload
-------------------------------*/
const globalForPrisma = globalThis as unknown as {
  prismaMain?: PrismaClient
  prismaPrimary?: PrismaClient
}

/*-------------------------------
5️⃣ Prisma Clients (Main & Primary)
-------------------------------*/
const prismaMain = isServer
  ? globalForPrisma.prismaMain ?? new PrismaClient(createPrismaOptions(process.env.DATABASE_URL!))
  : (undefined as unknown as PrismaClient)
const prismaPrimary = isServer
  ? globalForPrisma.prismaPrimary ??
    new PrismaClient(createPrismaOptions(process.env.DATABASE_PRIMARY_URL || process.env.DATABASE_URL!))
  : (undefined as unknown as PrismaClient)

// Hot-reload safe assignment in dev
if (isServer && process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaMain = prismaMain
  globalForPrisma.prismaPrimary = prismaPrimary
}

/*-------------------------------
6️⃣ Define Write Methods
-------------------------------*/
const WRITE_METHODS = [
  "create",
  "update",
  "delete",
  "upsert",
  "createMany",
  "updateMany",
  "deleteMany",
] as const
type WriteMethod = typeof WRITE_METHODS[number]
const isWriteMethod = (method: string): method is WriteMethod =>
  WRITE_METHODS.includes(method as WriteMethod)

/*-------------------------------
7️⃣ Helper Function: cleanOptions
-------------------------------*/
const cleanOptions = <T extends Record<string, unknown>>(args: T, keys: (keyof T)[]): T => {
  const cleaned = { ...args }
  keys.forEach(key => delete cleaned[key])
  return cleaned
}

/*-------------------------------
8️⃣ Method Proxy for Models
-------------------------------*/
const createMethodProxy = (model: any, modelName: string) =>
  new Proxy(model, {
    get(target, method) {
      const methodName = String(method)
      const isWrite = isWriteMethod(methodName)

      return (args: any = {}) => {
        try {
          if (isWrite) {
            // Write operation
            if (args?.writeToPrimary) {
              // Explicitly write to primary DB
              const cleaned = cleanOptions(args, ["writeToPrimary"])
              return (prismaPrimary as any)[modelName][method](cleaned)
            }
            // Default write → main DB
            const cleaned = cleanOptions(args, ["writeToPrimary"])
            return target[method](cleaned)
          }

          // Read operation → main DB
          return target[method](args)
        } catch (error) {
          // Add context for easier debugging
          if (error instanceof Error) {
            const context = `Method: ${methodName}, Model: ${modelName}`
            error.message = `${error.message} (${context})`
          }
          throw error
        }
      }
    },
  })

/*-------------------------------
9️⃣ Prisma Proxy Wrapper
-------------------------------*/
function createPrismaProxy(): PrismaClient {
  return new Proxy(prismaMain, {
    get(target, prop) {
      const propName = String(prop)

      // Handle $transaction with writeToPrimary support
      if (prop === "$transaction") {
        return async <T>(
          args: Prisma.PrismaPromise<T>[] | Prisma.TransactionClient,
          options?: TransactionOptions
        ): Promise<T> => {
          const { writeToPrimary, timeout, ...rest } = options || {}
          try {
            if (writeToPrimary) return await prismaPrimary.$transaction(args as any, { timeout, ...rest })
            return await prismaMain.$transaction(args as any, { timeout, ...rest })
          } catch (error) {
            console.error(
              `Transaction failed: ${error instanceof Error ? error.message : "Unknown error"}`
            )
            throw error
          }
        }
      }

      // Handle model methods via proxy
      if (prop in prismaMain && typeof (prismaMain as any)[prop] === "object") {
        return createMethodProxy((prismaMain as any)[prop], propName)
      }

      // Return other Prisma client properties as-is
      return (target as any)[prop]
    },
  })
}

// Export singleton Prisma client
export const prisma = isServer
  ? createPrismaProxy()
  : (new Proxy(
      {},
      {
        get() {
          throw new Error("Prisma is not available on the client. Import server-only modules from server components or API routes.")
        },
      }
    ) as unknown as PrismaClient)

/*-------------------------------
🔹 Health Check
-------------------------------*/
export async function checkDatabaseHealth(): Promise<{
  status: "healthy" | "unhealthy"
  details: string
}> {
  try {
    await prismaMain.$queryRaw`SELECT 1`
    return { status: "healthy", details: "Database connection successful" }
  } catch (error) {
    return {
      status: "unhealthy",
      details: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/*-------------------------------
🔹 Graceful Shutdown
-------------------------------*/
export async function disconnectPrisma(): Promise<void> {
  try {
    if (!isServer) return
    await Promise.all([prismaMain.$disconnect(), prismaPrimary.$disconnect()])
    console.log("Prisma clients disconnected successfully")
  } catch (error) {
    console.error("Error disconnecting Prisma clients:", error)
  }
}

const setupGracefulShutdown = () => {
  if (!isServer) return
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`)
    await disconnectPrisma()
    process.exit(0)
  }

  process.on("beforeExit", () => disconnectPrisma())
  process.on("SIGINT", () => shutdown("SIGINT"))
  process.on("SIGTERM", () => shutdown("SIGTERM"))
}
setupGracefulShutdown()
