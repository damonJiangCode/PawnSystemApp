import { registerHandlers } from "./ipc/register.ts";
import {
  registerImageProtocol,
  registerImageScheme,
} from "./image/image.protocol.ts";
import { hasMainWindow, openMainWindow } from "./window/window.main.ts";
import { openManagedWindow } from "./window/window.manager.ts";

const { app, BrowserWindow, Menu } =
  require("electron/main") as typeof import("electron");

app.setName("ME");
registerImageScheme();

type MenuActionConfig = {
  id: string;
  title: string;
  description: string;
  width?: number;
  height?: number;
};

const openMenuActionWindow = ({
  id,
  title,
  description,
  width = 720,
  height = 420,
}: MenuActionConfig) => {
  openManagedWindow({
    screen: id,
    title,
    description,
    width,
    height,
  });
};

const createAppMenu = () => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Ticket",
      submenu: [
        {
          label: "Expire",
          click: () =>
            openMenuActionWindow({
              id: "ticket-expire",
              title: "Expire Ticket",
              description: "Enter a ticket number and expire it.",
              width: 860,
              height: 680,
            }),
        },
        {
          label: "Mark Stolen",
          click: () =>
            openMenuActionWindow({
              id: "ticket-stolen",
              title: "Mark Ticket Stolen",
              description: "Mark a ticket as stolen for police/risk tracking.",
              width: 860,
              height: 680,
            }),
        },
      ],
    },
    {
      label: "Report",
      submenu: [
        {
          label: "Daily",
          click: () =>
            openMenuActionWindow({
              id: "report-daily",
              title: "Daily Report",
              description: "Generate daily ticket and payment records.",
              width: 1000,
              height: 720,
            }),
        },
        {
          label: "Buyback",
          click: () =>
            openMenuActionWindow({
              id: "report-buyback",
              title: "Buyback Report",
              description: "Generate daily pickup/buyback reconciliation.",
              width: 1000,
              height: 720,
            }),
        },
        {
          label: "Interest",
          click: () =>
            openMenuActionWindow({
              id: "report-interest",
              title: "Interest Report",
              description: "Generate interest payment records.",
              width: 1000,
              height: 720,
            }),
        },
        {
          label: "Overdue",
          click: () =>
            openMenuActionWindow({
              id: "report-overdue",
              title: "Overdue Report",
              description: "Review overdue pawn tickets by location range.",
              width: 1100,
              height: 760,
            }),
        },
        {
          label: "XML",
          click: () =>
            openMenuActionWindow({
              id: "report-xml",
              title: "XML Report",
              description: "Validate and upload LeadsOnline XML reports.",
              width: 1000,
              height: 720,
            }),
        },
      ],
    },
    {
      label: "Admin",
      submenu: [
        {
          label: "Employee",
          click: () =>
            openMenuActionWindow({
              id: "admin-employee",
              title: "Employee",
              description: "Manage employee information.",
              width: 1120,
              height: 820,
            }),
        },
        {
          label: "Holiday",
          click: () =>
            openMenuActionWindow({
              id: "admin-holiday",
              title: "Holiday",
              description: "Manage business-day holidays.",
              width: 960,
              height: 760,
            }),
        },
        {
          label: "Hair Color",
          click: () =>
            openMenuActionWindow({
              id: "admin-hair-color",
              title: "Hair Color",
              description: "Manage hair color options.",
              width: 960,
              height: 760,
            }),
        },
        {
          label: "Eye Color",
          click: () =>
            openMenuActionWindow({
              id: "admin-eye-color",
              title: "Eye Color",
              description: "Manage eye color options.",
              width: 960,
              height: 760,
            }),
        },
        {
          label: "Location",
          click: () =>
            openMenuActionWindow({
              id: "admin-location",
              title: "Location",
              description: "Manage pawn locations.",
              width: 960,
              height: 760,
            }),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

app.whenReady().then(() => {
  registerImageProtocol();
  openMainWindow();
  createAppMenu();
  registerHandlers();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 || !hasMainWindow()) {
    openMainWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

process.on("uncaughtException", (error) => {
  console.error("[main] uncaught exception", error);
});

process.on("unhandledRejection", (error) => {
  console.error("[main] unhandled rejection", error);
});
