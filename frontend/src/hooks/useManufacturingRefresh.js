import { useEffect } from "react";

import {
  MANUFACTURING_EVENTS,
  subscribeManufacturingEvents,
} from "../utils/manufacturingEvents";

/** Default: refresh on any spine mutation that notifyManufacturingSpine fans out. */
const DEFAULT_EVENTS = [
  MANUFACTURING_EVENTS.WORK_ORDER_UPDATED,
  MANUFACTURING_EVENTS.WORK_ORDER_COMPLETED,
  MANUFACTURING_EVENTS.MATERIALS_ISSUED,
  MANUFACTURING_EVENTS.MRP_RUN,
  MANUFACTURING_EVENTS.MATERIAL_REQUEST_CONVERTED,
  MANUFACTURING_EVENTS.PURCHASE_ORDER_CREATED,
  MANUFACTURING_EVENTS.GRN_RECEIVED,
  MANUFACTURING_EVENTS.GRN_QC_PASSED,
  MANUFACTURING_EVENTS.ORDER_PACKED,
  MANUFACTURING_EVENTS.ORDER_SHIPPED,
  MANUFACTURING_EVENTS.INVOICE_CREATED,
  MANUFACTURING_EVENTS.PAYMENT_RECORDED,
  MANUFACTURING_EVENTS.INVENTORY_CHANGED,
  MANUFACTURING_EVENTS.DASHBOARD_REFRESH,
];

/**
 * Re-run `onRefresh` when manufacturing spine events fire.
 * @param {() => void | Promise<void>} onRefresh
 * @param {string[]} [eventTypes]
 */
export default function useManufacturingRefresh(
  onRefresh,
  eventTypes = DEFAULT_EVENTS
) {
  useEffect(() => {
    if (!onRefresh) return undefined;
    const types = new Set(eventTypes);
    return subscribeManufacturingEvents((event) => {
      if (types.has(event.type)) {
        onRefresh(event);
      }
    });
  }, [onRefresh, eventTypes]);
}
