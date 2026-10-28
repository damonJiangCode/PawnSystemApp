import { connect } from "../../../../../database/connection.ts";
import type { DbClient } from "../../../../../database/connection.ts";
import type {
  ItemSearchInput,
  SaveItemInput,
} from "../../../../../shared/payload-contracts/item.contract.ts";
import type { Item } from "../../../../../shared/models/item.model.ts";
import type { Ticket } from "../../../../../shared/models/ticket.model.ts";

const mapItemRow = (row: Record<string, unknown>): Item => {
  const latestTicketStatus = row.latest_ticket_status
    ? (String(row.latest_ticket_status) as Ticket["status"])
    : undefined;

  return {
    item_number: Number(row.item_number),
    quantity: Number(row.quantity ?? 0),
    subcategory_id: row.subcategory_id ? Number(row.subcategory_id) : undefined,
    category_name: row.category_name ? String(row.category_name) : "",
    subcategory_name: row.subcategory_name ? String(row.subcategory_name) : "",
    description: row.description ? String(row.description) : "",
    brand_name: row.brand_name ? String(row.brand_name) : "",
    model_number: row.model_number ? String(row.model_number) : "",
    serial_number: row.serial_number ? String(row.serial_number) : "",
    amount: Number(row.amount ?? 0),
    latest_ticket_number: row.latest_ticket_number
      ? Number(row.latest_ticket_number)
      : undefined,
    latest_ticket_status: latestTicketStatus,
    is_loadable: latestTicketStatus
      ? latestTicketStatus !== "pawned" && latestTicketStatus !== "sold"
      : true,
    image_path: row.image_path ? String(row.image_path) : "",
  };
};

const itemSelectColumns = `
  iws.item_number,
  iws.quantity,
  iws.subcategory_id,
  iws.category_name,
  iws.subcategory_name,
  iws.description,
  iws.brand_name,
  iws.model_number,
  iws.serial_number,
  iws.amount,
  iws.latest_ticket_number,
  iws.latest_ticket_status,
  iws.image_path
`;

export const itemRepo = {
  loadByTicketNumber: async (ticketNumber: number): Promise<Item[]> => {
    const client = await connect();
    const query = `
      SELECT ${itemSelectColumns}
      FROM item_with_status iws
      INNER JOIN ticket_item ti
        ON ti.item_number = iws.item_number
       AND ti.ticket_number = $1
      WHERE ti.ticket_number = $1
      ORDER BY iws.item_number DESC
    `;

    try {
      const result = await client.query(query, [ticketNumber]);
      return result.rows.map(mapItemRow);
    } finally {
      client.release();
    }
  },

  loadByItemNumber: async (
    itemNumber: number,
    dbClient: DbClient,
  ): Promise<Item | null> => {
    const query = `
      SELECT ${itemSelectColumns}
      FROM item_with_status iws
      WHERE iws.item_number = $1
      LIMIT 1
    `;

    const result = await dbClient.query(query, [itemNumber]);
    return result.rows[0] ? mapItemRow(result.rows[0]) : null;
  },

  search: async (payload: ItemSearchInput): Promise<Item[]> => {
    const conditions: string[] = [];
    const values: Array<number | string> = [];

    if (payload.client_number !== undefined) {
      values.push(payload.client_number);
      conditions.push(`iws.item_number IN (
        SELECT ti.item_number FROM ticket t
        INNER JOIN ticket_item ti ON ti.ticket_number = t.ticket_number
        WHERE t.client_number = $${values.length}
      )`);
    }

    if (payload.item_number) {
      values.push(payload.item_number);
      conditions.push(`iws.item_number = $${values.length}`);
    } else {
      const categoryId = payload.category_id;
      const subcategoryId = payload.subcategory_id;
      const brandName = payload.brand_name?.trim();
      const modelNumber = payload.model_number?.trim();
      const serialNumber = payload.serial_number?.trim();

      if (categoryId) {
        values.push(categoryId);
        conditions.push(
          `iws.category_name = (SELECT name FROM item_category WHERE id = $${values.length})`,
        );
      }

      if (subcategoryId) {
        values.push(subcategoryId);
        conditions.push(`iws.subcategory_id = $${values.length}`);
      }

      if (brandName) {
        values.push(`%${brandName}%`);
        conditions.push(`iws.brand_name ILIKE $${values.length}`);
      }

      if (modelNumber) {
        values.push(`%${modelNumber}%`);
        conditions.push(`iws.model_number ILIKE $${values.length}`);
      }

      if (serialNumber) {
        values.push(`%${serialNumber}%`);
        conditions.push(`iws.serial_number ILIKE $${values.length}`);
      }
    }

    if (!conditions.length) {
      return [];
    }

    const client = await connect();
    const query = `
      SELECT ${itemSelectColumns}
      FROM item_with_status iws
      WHERE ${conditions.join(" AND ")}
      ORDER BY iws.item_number DESC
    `;

    try {
      const result = await client.query(query, values);
      return result.rows.map(mapItemRow);
    } finally {
      client.release();
    }
  },

  assertItemCanBeLoaded: async (
    itemNumber: number,
    targetTicketNumber: number,
    dbClient: DbClient,
  ): Promise<void> => {
    const result = await dbClient.query(
      `
        SELECT
          item_number,
          latest_ticket_number,
          latest_ticket_status
        FROM item_with_status
        WHERE item_number = $1
        LIMIT 1
      `,
      [itemNumber],
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error(`Item #${itemNumber} was not found.`);
    }

    const latestTicketNumber = row.latest_ticket_number
      ? Number(row.latest_ticket_number)
      : undefined;
    const latestTicketStatus = row.latest_ticket_status
      ? String(row.latest_ticket_status)
      : "";

    if (
      (latestTicketStatus === "pawned" || latestTicketStatus === "sold") &&
      latestTicketNumber !== targetTicketNumber
    ) {
      throw new Error(
        `Item #${itemNumber} is already active on ticket #${latestTicketNumber}.`,
      );
    }
  },

  linkItemToTicket: async (
    ticketNumber: number,
    itemNumber: number,
    dbClient: DbClient,
  ): Promise<Item> => {
    await itemRepo.assertItemCanBeLoaded(itemNumber, ticketNumber, dbClient);

    await dbClient.query(
      `
        INSERT INTO ticket_item (ticket_number, item_number)
        VALUES ($1, $2)
        ON CONFLICT (ticket_number, item_number) DO NOTHING
      `,
      [ticketNumber, itemNumber],
    );

    const item = await itemRepo.loadByItemNumber(itemNumber, dbClient);

    if (!item) {
      throw new Error(`Item #${itemNumber} was not found after linking.`);
    }

    return item;
  },

  create: async (payload: SaveItemInput, dbClient: DbClient): Promise<Item> => {
    const query = `
      INSERT INTO item (
        quantity,
        subcategory_id,
        description,
        brand_name,
        model_number,
        serial_number,
        amount,
        image_path
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING item_number
    `;

    const result = await dbClient.query(query, [
      payload.quantity,
      payload.subcategory_id,
      payload.description,
      payload.brand_name,
      payload.model_number,
      payload.serial_number,
      payload.amount,
      payload.image_path ?? "",
    ]);

    const itemNumber = Number(result.rows[0].item_number);

    await dbClient.query(
      `
        INSERT INTO ticket_item (ticket_number, item_number)
        VALUES ($1, $2)
        ON CONFLICT (ticket_number, item_number) DO NOTHING
      `,
      [payload.ticket_number, itemNumber],
    );

    const item = await itemRepo.loadByItemNumber(itemNumber, dbClient);

    if (!item) {
      throw new Error(`Item #${itemNumber} was not found after creating.`);
    }

    return item;
  },

  update: async (payload: SaveItemInput, dbClient: DbClient): Promise<Item> => {
    const query = `
      UPDATE item
      SET
        quantity = $1,
        subcategory_id = $2,
        description = $3,
        brand_name = $4,
        model_number = $5,
        serial_number = $6,
        amount = $7,
        image_path = $8
      WHERE item_number = $9
      RETURNING item_number
    `;

    const result = await dbClient.query(query, [
      payload.quantity,
      payload.subcategory_id,
      payload.description,
      payload.brand_name,
      payload.model_number,
      payload.serial_number,
      payload.amount,
      payload.image_path ?? "",
      payload.item_number,
    ]);

    if (!result.rows[0]) {
      throw new Error(
        `[itemRepo] update(): Item #${payload.item_number} not found`,
      );
    }

    const item = await itemRepo.loadByItemNumber(
      Number(result.rows[0].item_number),
      dbClient,
    );

    if (!item) {
      throw new Error(
        `[itemRepo] update(): Item #${payload.item_number} not found after update`,
      );
    }

    return item;
  },

  updateImagePath: async (
    itemNumber: number,
    imagePath: string,
    dbClient: DbClient,
  ): Promise<void> => {
    await dbClient.query(
      `
        UPDATE item
        SET image_path = $1
        WHERE item_number = $2
      `,
      [imagePath, itemNumber],
    );
  },

  delete: async (
    ticketNumber: number,
    itemNumber: number,
    dbClient: DbClient,
  ): Promise<void> => {
    await dbClient.query(
      `
        DELETE FROM ticket_item
        WHERE ticket_number = $1
          AND item_number = $2
      `,
      [ticketNumber, itemNumber],
    );
  },
};
