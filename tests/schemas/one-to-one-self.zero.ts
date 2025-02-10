import { ANYONE_CAN, definePermissions, type Schema } from "@rocicorp/zero";
import { createZeroSchema } from "../../src";
import * as oneToOneSelf from "./one-to-one-self.schema";

export const schema = createZeroSchema(oneToOneSelf, {
  version: 1,
  tables: {
    users: {
      id: true,
      name: true,
      invitedBy: true,
    },
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
  };
});
