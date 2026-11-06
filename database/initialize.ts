import { connect } from "./connection.ts";
import { createCityTable } from "./schema/client/cityTable.ts";
import { createClientIDTable } from "./schema/client/clientIdTable.ts";
import { createClientTable } from "./schema/client/clientTable.ts";
import { createEyeColorTable } from "./schema/client/eyeColorTable.ts";
import { createHairColorTable } from "./schema/client/hairColorTable.ts";
import { createIDTypeTable } from "./schema/client/idTypeTable.ts";
import { createEmployeeTable } from "./schema/employee/employeeTable.ts";
import { createHolidayDateTable } from "./schema/ticket/holidayDateTable.ts";
import {
  createInterestPaymentIndexes,
  createInterestPaymentTable,
} from "./schema/ticket/interestPaymentTable.ts";
import { createItemCategoryTable } from "./schema/item/itemCategoryTable.ts";
import { createItemSubcategoryTable } from "./schema/item/itemSubcategoryTable.ts";
import { createItemIndexes, createItemTable } from "./schema/item/itemTable.ts";
import { createLocationTable } from "./schema/ticket/locationTable.ts";
import {
  createTicketIndexes,
  createTicketTable,
} from "./schema/ticket/ticketTable.ts";
import {
  createTicketItemIndexes,
  createTicketItemTable,
} from "./schema/ticket/ticketItemTable.ts";
import {
  createTicketReversalIndexes,
  createTicketReversalTable,
} from "./schema/ticket/ticketReversalTable.ts";
import {
  createXmlReportSubmissionIndexes,
  createXmlReportSubmissionTable,
} from "./schema/report/xmlReportSubmissionTable.ts";
import {
  createPreventItemMultiplePawnedTicketsFunction,
  createPreventItemMultiplePawnedTicketsTrigger,
  createPreventTicketWithConflictingPawnedItemsFunction,
  createPreventTicketWithConflictingPawnedItemsTrigger,
} from "./functions/ticketItemGuards.ts";
import { createItemWithStatusView } from "./views/itemWithStatusView.ts";
import {
  seedCities,
  seedEyeColors,
  seedHairColors,
  seedIdTypes,
} from "./seed/clientSeeds.ts";
import { seedItemCategories, seedItemSubcategories } from "./seed/itemSeeds.ts";
import { seedHolidayDates, seedLocations } from "./seed/ticketSeeds.ts";

export const initializeDatabase = async () => {
  const client = await connect();

  try {
    await client.query("BEGIN");

    // Create database structure.
    await client.query(createCityTable);
    console.log("city table created successfully");

    await client.query(createHairColorTable);
    console.log("hair_color table created successfully");

    await client.query(createEyeColorTable);
    console.log("eye_color table created successfully");

    await client.query(createIDTypeTable);
    console.log("id_type table created successfully");

    await client.query(createClientTable);
    console.log("client table created successfully");

    await client.query(createClientIDTable);
    console.log("client_id table created successfully");

    await client.query(createLocationTable);
    console.log("location table created successfully");

    await client.query(createTicketTable);
    console.log("ticket table created successfully");

    await client.query(createTicketIndexes);
    console.log("ticket indexes created successfully");

    await client.query(createHolidayDateTable);
    console.log("holiday_date table created successfully");

    await client.query(createInterestPaymentTable);
    console.log("interest_payment table created successfully");

    await client.query(createInterestPaymentIndexes);
    console.log("interest_payment indexes created successfully");

    await client.query(createItemCategoryTable);
    console.log("item_category table created successfully");

    await client.query(createItemSubcategoryTable);
    console.log("item_subcategory table created successfully");

    await client.query(createItemTable);
    console.log("item table created successfully");

    await client.query(createItemIndexes);
    console.log("item subcategory index ensured successfully");

    await client.query(createTicketItemTable);
    console.log("ticket_item table created successfully");

    await client.query(createTicketItemIndexes);
    console.log("ticket_item indexes created successfully");

    await client.query(createItemWithStatusView);
    console.log("item_with_status view created successfully");

    await client.query(createPreventItemMultiplePawnedTicketsFunction);
    console.log(
      "prevent_item_multiple_pawned_tickets function created successfully",
    );

    await client.query(createPreventItemMultiplePawnedTicketsTrigger);
    console.log(
      "prevent_item_multiple_pawned_tickets trigger created successfully",
    );

    await client.query(createPreventTicketWithConflictingPawnedItemsFunction);
    console.log(
      "prevent_ticket_with_conflicting_pawned_items function created successfully",
    );

    await client.query(createPreventTicketWithConflictingPawnedItemsTrigger);
    console.log(
      "prevent_ticket_with_conflicting_pawned_items trigger created successfully",
    );

    await client.query(createEmployeeTable);
    console.log("employee table created successfully");

    await client.query(createTicketReversalTable);
    console.log("ticket_reversal table created successfully");

    await client.query(createTicketReversalIndexes);
    console.log("ticket_reversal indexes created successfully");

    await client.query(createXmlReportSubmissionTable);
    console.log("xml_report_submission table created successfully");

    await client.query(createXmlReportSubmissionIndexes);
    console.log("xml_report_submission indexes created successfully");

    // Seed default data.
    await seedCities(client);
    console.log("cities seeded successfully");

    await seedHairColors(client);
    console.log("hair colors seeded successfully");

    await seedEyeColors(client);
    console.log("eye colors seeded successfully");

    await seedIdTypes(client);
    console.log("id types seeded successfully");

    await seedHolidayDates(client);
    console.log("holiday dates seeded successfully");

    await seedItemCategories(client);
    console.log("item categories seeded successfully");

    await seedItemSubcategories(client);
    console.log("item subcategories seeded successfully");

    await seedLocations(client);
    console.log("locations seeded successfully");

    await client.query("COMMIT");
    console.log("All database tables initialized successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error initializing database:", error);
    throw error;
  } finally {
    client.release();
  }
};
