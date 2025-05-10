import { ANYONE_CAN, definePermissions, type Schema } from "@rocicorp/zero";
import { drizzleZeroConfig } from "../../src";
import * as oneToOne2 from "./one-to-one-2.schema";

export const schema = drizzleZeroConfig(oneToOne2, {
  tables: {
    userTable: {
      id: true,
      name: true,
      partner: true,
    },
    mediumTable: {
      id: true,
      name: true,
    },
    messageTable: {
      id: true,
      senderId: true,
      mediumId: true,
      body: true,
    },
  },
});

export const permissions = definePermissions<{}, Schema>(schema, () => {
  return {
    mediumTable: {
      row: {
        select: ANYONE_CAN,
        insert: ANYONE_CAN,
        update: {
          preMutation: ANYONE_CAN,
          postMutation: ANYONE_CAN,
        },
        delete: ANYONE_CAN,
      },
    },
    messageTable: {
      row: {
        select: ANYONE_CAN,
        insert: ANYONE_CAN,
        update: {
          preMutation: ANYONE_CAN,
          postMutation: ANYONE_CAN,
        },
        delete: ANYONE_CAN,
      },
    },
    userTable: {
      row: {
        select: ANYONE_CAN,
        insert: ANYONE_CAN,
        update: {
          preMutation: ANYONE_CAN,
          postMutation: ANYONE_CAN,
        },
        delete: ANYONE_CAN,
      },
    },
  };
});
