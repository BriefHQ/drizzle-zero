import { ANYONE_CAN, definePermissions, type Schema } from "@rocicorp/zero";
import { createZeroSchema } from "../../src";
import * as oneToOne2 from "./one-to-one-2.schema";

export const schema = createZeroSchema(oneToOne2, {
  version: 2.1,
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
  manyToMany: {
    userTable: {
      mediums: ["messageTable", "mediumTable"],
    },
  },
});

export const permissions = definePermissions<{}, Schema>(schema, () => {
  return {
    mediumTable: {
      row: {
        insert: ANYONE_CAN,
        update: ANYONE_CAN,
        delete: ANYONE_CAN,
      },
    },
    messageTable: {
      row: {
        insert: ANYONE_CAN,
        update: ANYONE_CAN,
        delete: ANYONE_CAN,
      },
    },
    userTable: {
      row: {
        insert: ANYONE_CAN,
        update: ANYONE_CAN,
        delete: ANYONE_CAN,
      },
    },
  };
});
