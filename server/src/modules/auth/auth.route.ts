import { FastifyInstance }
  from "fastify";

import {
  registerController,
  loginController,
} from "./auth.controller.js";

import { authMiddleware }
  from "../../middleware/auth.middleware.js";

export async function authRoutes(
  app: FastifyInstance
) {
  app.post(
    "/register",
    registerController
  );

  app.post(
    "/login",
    loginController
  );

  app.get(
    "/me",
    {
      preHandler: authMiddleware,
    },
    async (request: any) => {
      return {
        success: true,
        user: request.user,
      };
    }
  );
}