import { z } from "zod";
import { privateProcedure, router } from "@/lib/trpc";
import { Application, ConfigType } from "@prisma/client";


const configInput = z.object({
  application: z.nativeEnum(Application),
  key: z.string(),
  configType: z.nativeEnum(ConfigType).default(ConfigType.Key),
});

export const userRouter = router({
  me: privateProcedure.query(async ({ ctx }) => {
    return ctx.user
  }),
  config: privateProcedure.input(
    configInput
  ).mutation(async ({ ctx, input }) => {
    return ctx.prisma.config.upsert({
      create: {
        key: input.key,
        userId: ctx.user.id,
        application: input.application,
        type: input.configType

      },
      where: {
        userId_application_type: {
          userId: ctx.user.id,
          application: input.application,
          type: input.configType
        },
      },
      update: {
        key: input.key,
      }
    })
  })
})