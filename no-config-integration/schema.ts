import {
  ANYONE_CAN,
  definePermissions,
  type ExpressionBuilder,
  type InsertValue,
  type Row,
} from "@rocicorp/zero";
import { schema, type Schema } from "./zero-schema.gen";

export { schema, type Schema };

export type Message = Row<Schema["tables"]["message"]>;
export type Medium = Row<Schema["tables"]["medium"]>;
export type User = Row<Schema["tables"]["user"]>;

export type InsertUser = InsertValue<typeof schema.tables.user>;

// The contents of your decoded JWT.
type AuthData = {
  sub: string | null;
};

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
  const allowIfSenderIs1 = (
    _authData: AuthData,
    { cmp }: ExpressionBuilder<Schema, "message">,
  ) => cmp("senderId", "=", "1");

  return {
    medium: {
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
    user: {
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
    message: {
      row: {
        select: [allowIfSenderIs1],
        insert: ANYONE_CAN,
        update: {
          preMutation: [allowIfSenderIs1],
          postMutation: ANYONE_CAN,
        },
        delete: [allowIfSenderIs1],
      },
    },
    allTypes: {
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
    friendship: {
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
    filters: {
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
