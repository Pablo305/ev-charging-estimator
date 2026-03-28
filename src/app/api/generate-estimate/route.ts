import { NextResponse } from 'next/server';
import { generateEstimate } from '@/lib/estimate/engine';
import { EstimateInput } from '@/lib/estimate/types';

function ensureDefaults(body: Record<string, unknown>): EstimateInput {
  const input = body as Partial<EstimateInput>;

  // Ensure all required nested objects exist with safe defaults
  return {
    project: {
      name: input.project?.name ?? '',
      salesRep: input.project?.salesRep ?? '',
      projectType: input.project?.projectType ?? 'full_turnkey',
      timeline: input.project?.timeline ?? '',
      isNewConstruction: input.project?.isNewConstruction ?? null,
    },
    customer: {
      companyName: input.customer?.companyName ?? '',
      contactName: input.customer?.contactName ?? '',
      contactEmail: input.customer?.contactEmail ?? '',
      contactPhone: input.customer?.contactPhone ?? '',
      billingAddress: input.customer?.billingAddress ?? '',
    },
    site: {
      address: input.site?.address ?? '',
      siteType: input.site?.siteType ?? null,
      state: input.site?.state ?? '',
    },
    parkingEnvironment: {
      type: input.parkingEnvironment?.type ?? null,
      hasPTSlab: input.parkingEnvironment?.hasPTSlab ?? null,
      slabScanRequired: input.parkingEnvironment?.slabScanRequired ?? null,
      coringRequired: input.parkingEnvironment?.coringRequired ?? null,
      surfaceType: input.parkingEnvironment?.surfaceType ?? null,
      trenchingRequired: input.parkingEnvironment?.trenchingRequired ?? null,
      boringRequired: input.parkingEnvironment?.boringRequired ?? null,
      trafficControlRequired: input.parkingEnvironment?.trafficControlRequired ?? null,
      indoorOutdoor: input.parkingEnvironment?.indoorOutdoor ?? null,
      fireRatedPenetrations: input.parkingEnvironment?.fireRatedPenetrations ?? null,
      accessRestrictions: input.parkingEnvironment?.accessRestrictions ?? '',
    },
    charger: {
      brand: input.charger?.brand ?? '',
      model: input.charger?.model ?? '',
      count: input.charger?.count ?? 0,
      pedestalCount: input.charger?.pedestalCount ?? 0,
      portType: input.charger?.portType ?? null,
      mountType: input.charger?.mountType ?? null,
      isCustomerSupplied: input.charger?.isCustomerSupplied ?? false,
      chargingLevel: input.charger?.chargingLevel ?? null,
      ampsPerCharger: input.charger?.ampsPerCharger ?? null,
      volts: input.charger?.volts ?? null,
    },
    electrical: {
      serviceType: input.electrical?.serviceType ?? null,
      availableCapacityKnown: input.electrical?.availableCapacityKnown ?? false,
      availableAmps: input.electrical?.availableAmps ?? null,
      breakerSpaceAvailable: input.electrical?.breakerSpaceAvailable ?? null,
      panelUpgradeRequired: input.electrical?.panelUpgradeRequired ?? null,
      transformerRequired: input.electrical?.transformerRequired ?? null,
      switchgearRequired: input.electrical?.switchgearRequired ?? null,
      distanceToPanel_ft: input.electrical?.distanceToPanel_ft ?? null,
      utilityCoordinationRequired: input.electrical?.utilityCoordinationRequired ?? null,
      meterRoomRequired: input.electrical?.meterRoomRequired ?? null,
      junctionBoxCount: input.electrical?.junctionBoxCount ?? null,
      disconnectRequired: input.electrical?.disconnectRequired ?? null,
      electricalRoomDescription: input.electrical?.electricalRoomDescription ?? '',
      pvcConduit4in_ft: input.electrical?.pvcConduit4in_ft ?? null,
      pvcConduit3in_ft: input.electrical?.pvcConduit3in_ft ?? null,
      pvcConduit1in_ft: input.electrical?.pvcConduit1in_ft ?? null,
      wire500mcm_ft: input.electrical?.wire500mcm_ft ?? null,
    },
    civil: {
      installationLocationDescription: input.civil?.installationLocationDescription ?? '',
      trenchDistance_ft: input.civil?.trenchDistance_ft ?? null,
      asphaltRemoval_sf: input.civil?.asphaltRemoval_sf ?? null,
      asphaltRestore_sf: input.civil?.asphaltRestore_sf ?? null,
      encasement_CY: input.civil?.encasement_CY ?? null,
      postFoundation_CY: input.civil?.postFoundation_CY ?? null,
      cabinetPad_CY: input.civil?.cabinetPad_CY ?? null,
      groundPrepCabinet: input.civil?.groundPrepCabinet ?? null,
    },
    permit: {
      responsibility: input.permit?.responsibility ?? null,
      feeAllowance: input.permit?.feeAllowance ?? null,
    },
    designEngineering: {
      responsibility: input.designEngineering?.responsibility ?? null,
      stampedPlansRequired: input.designEngineering?.stampedPlansRequired ?? null,
    },
    network: {
      type: input.network?.type ?? null,
      wifiInstallResponsibility: input.network?.wifiInstallResponsibility ?? null,
    },
    accessories: {
      bollardQty: input.accessories?.bollardQty ?? 0,
      signQty: input.accessories?.signQty ?? 0,
      wheelStopQty: input.accessories?.wheelStopQty ?? 0,
      stripingRequired: input.accessories?.stripingRequired ?? false,
      padRequired: input.accessories?.padRequired ?? false,
      debrisRemoval: input.accessories?.debrisRemoval ?? false,
    },
    makeReady: {
      responsibility: input.makeReady?.responsibility ?? null,
    },
    chargerInstall: {
      responsibility: input.chargerInstall?.responsibility ?? null,
    },
    purchasingChargers: {
      responsibility: input.purchasingChargers?.responsibility ?? null,
    },
    signageBollards: {
      responsibility: input.signageBollards?.responsibility ?? null,
    },
    estimateControls: {
      pricingTier: input.estimateControls?.pricingTier ?? 'bulk_discount',
      taxRate: input.estimateControls?.taxRate ?? 0,
      contingencyPercent: input.estimateControls?.contingencyPercent ?? 0,
      markupPercent: input.estimateControls?.markupPercent ?? 0,
    },
    notes: input.notes ?? '',
    removeReplace: input.removeReplace,
    mapWorkspace: input.mapWorkspace,
    rawLineItems: input.rawLineItems,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 },
      );
    }

    const input = ensureDefaults(body as Record<string, unknown>);
    const output = generateEstimate(input);
    return NextResponse.json(output);
  } catch (err: unknown) {
    console.error('Generate estimate error:', err);
    return NextResponse.json(
      { error: 'Estimate generation failed. Please try again.' },
      { status: 500 },
    );
  }
}
