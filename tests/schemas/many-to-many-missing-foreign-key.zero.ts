import {
  ANYONE_CAN,
  createSchema,
  definePermissions,
  type Schema,
} from "@rocicorp/zero";
import { createZeroSchema } from "../../src";
import * as manyToManyForeignKey from "./many-to-many-missing-foreign-key.schema";

export const schema = createSchema(
  createZeroSchema(manyToManyForeignKey, {
    version: 1,
    tables: {
      user: {
        id: true,
        name: true,
      },
      group: {
        id: true,
        name: true,
      },
      users_to_group: {
        user_id: true,
        group_id: true,
      },
    },
    manyToMany: {
      user: {
        groups: ["users_to_group", "group"],
      },
    },
  }),
);

export const permissions = definePermissions<{}, Schema>(schema, () => {
  return {
    group: {
      row: {
        insert: ANYONE_CAN,
        update: ANYONE_CAN,
        delete: ANYONE_CAN,
      },
    },
    user: {
      row: {
        insert: ANYONE_CAN,
        update: ANYONE_CAN,
        delete: ANYONE_CAN,
      },
    },
    users_to_group: {
      row: {
        insert: ANYONE_CAN,
        update: ANYONE_CAN,
        delete: ANYONE_CAN,
      },
    },
  };
});