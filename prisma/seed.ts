import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const userData: Prisma.UserCreateInput[] = [
  {
    name: 'Gon',
    username: 'gon',
    password: 'oporayam!'
  }
]

export async function main() {
  for (const u of userData) {
    await prisma.user.create({ data: u })
  }
}

main()