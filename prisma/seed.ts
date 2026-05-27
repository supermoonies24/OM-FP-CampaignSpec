import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_SETTINGS: Record<string, string[]> = {
  dropdown_productLineShort: [
    "VEH (Vehicle)",
    "SOF (Software)",
    "SER (Service)",
    "EVT (Event)",
    "FIN (Finance)",
    "PRO (Ford Pro - other)",
  ],
  dropdown_productLineFull: [
    "VEH CHASSISCAB",
    "VEH SUPERDUTY",
    "VEH TRANSIT",
    "VEH ETRANSIT",
    "VEH EV",
    "VEH ICE",
    "VEH GENERAL",
    "SOF TELEMATICS",
    "SOF DASHCAM",
    "SOF FLEETMANAGEMENT",
    "SOF TITLEREGISTRATION",
    "SOF GENERAL",
    "FIN FINSIMPLE",
    "FIN CLOC",
    "FIN GENERAL",
    "SER MOBILESERVICE",
    "SER GENERAL",
  ],
  dropdown_audience: ["Fleets", "DnB", "Handraisers", "SDIndividuals", "Leads"],
  dropdown_segmentation: [
    "Attendees",
    "VehicleInMarket",
    "SoftwareInMarket",
    "ServiceInMarket",
    "Remaining",
    "Custom",
    "Essentials",
    "Telematics",
    "ETelematics",
    "XS",
    "S",
    "MXL",
    "Govt",
    "ALL",
    "Undersaturated",
    "Unknown",
    "FINCODE",
    "NONFINCODE",
  ],
  dropdown_country: ["US", "C"],
  dropdown_language: ["E", "F"],
  dropdown_campaignType: ["Always-on", "API trigger", "One-time"],
  dropdown_sendType: ["Multi-touch", "Single message", "Re-send"],
  dropdown_emailBuildType: ["New HTML", "Template-based", "Update Existing", "Content Block"],
  dropdown_sendFromName: [
    "Ford Fleet Care",
    "Ford Pro Fleet Network",
    "Ford Professional Service Network",
    "Ford Rewards Program",
    "Ford Pro",
    "Ford Motor Company",
  ],
  dropdown_sendFromAddress: ["reply@e.fordpro.com"],
  dropdown_audienceSource: [
    "Ad-hoc file import",
    "Data Cloud Segment",
    "Synchronized DE",
    "Salesforce Data",
    "Cloud Page",
    "Event",
    "Audience (SMS)",
  ],
  dropdown_abTestType: ["Subject line", "Time of day", "From name", "Content"],
  dropdown_abAudienceSplit: ["50:50", "10:10:80"],
  dropdown_assetType: ["button", "text", "banner", "image", "other"],
  dropdown_versionType: ["No", "Control Version", "Test Version", "3", "4", "5"],
  dropdown_emailGroupNum: Array.from({ length: 18 }, (_, i) => String(i + 1)),
  dropdown_status: ["draft", "in_review", "approved", "sent"],
};

async function main() {
  // Seed default settings
  for (const [key, values] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.appSettings.upsert({
      where: { key },
      update: { value: JSON.stringify(values) },
      create: { key, value: JSON.stringify(values) },
    });
  }

  // Seed required fields config (empty by default)
  await prisma.appSettings.upsert({
    where: { key: "requiredFields" },
    update: {},
    create: { key: "requiredFields", value: JSON.stringify({}) },
  });

  // Seed one example campaign
  const existing = await prisma.campaign.findFirst({ where: { campaignName: "SpringFleetPromo" } });
  if (!existing) {
    const campaign = await prisma.campaign.create({
      data: {
        weekOf: "2026-05-25",
        brand: "Ford Pro",
        businessUnit: "Fleet",
        campaignName: "SpringFleetPromo",
        productLine: "VEH (Vehicle)",
        audience: "Fleets",
        segmentation: "Telematics",
        country: "US",
        language: "E",
        emailBuildType: "Template-based",
        campaignType: "One-time",
        sendType: "Single message",
        numSends: 1,
        sendFromName: "Ford Pro",
        sendFromAddress: "reply@e.fordpro.com",
        desiredSendDate: "2026-05-30",
        desiredSendTime: "9:00",
        status: "draft",
      },
    });

    await prisma.emailSend.create({
      data: {
        campaignId: campaign.id,
        emailNumber: 1,
        productLine: "VEH (Vehicle)",
        description: "SpringFleetPromo",
        audience: "Fleets",
        segmentation: "Telematics",
        country: "US",
        language: "E",
        versionType: "No",
        emailGroupNum: 1,
        subjectLine: "Spring into savings with Ford Pro Fleet",
        preheader: "Exclusive offers just for fleet managers.",
      },
    });

    await prisma.seedListEntry.create({
      data: { campaignId: campaign.id, listType: "onemagnify", firstName: "Dev", email: "dev@onemagnify.com" },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
