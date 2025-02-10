import { ANYONE_CAN, definePermissions, type Schema } from "@rocicorp/zero";
import { createZeroSchema } from "../../src";
import * as manyToMany from "./many-to-many.schema";

export const schema = createZeroSchema(manyToMany, {
  version: 1,
  tables: {
    users: {
      id: true,
      name: true,
    },
    usersToGroups: {
      userId: true,
      groupId: true,
    },
    groups: false,
  },
});

export const permissions = definePermissions<{}, Schema>(schema, () => {
  return {
    users: {
      row: {
        insert: ANYONE_CAN,
        update: ANYONE_CAN,
        delete: ANYONE_CAN,
      },
    },
    usersToGroups: {
      row: {
        insert: ANYONE_CAN,
        update: ANYONE_CAN,
        delete: ANYONE_CAN,
      },
    },
  };
});
