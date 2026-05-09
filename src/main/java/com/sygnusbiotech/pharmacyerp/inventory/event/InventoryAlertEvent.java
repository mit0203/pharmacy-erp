package com.sygnusbiotech.pharmacyerp.inventory.event;

import org.springframework.context.ApplicationEvent;

public class InventoryAlertEvent extends ApplicationEvent {

    private final String medicineId;

    public InventoryAlertEvent(Object source, String medicineId) {
        super(source);
        this.medicineId = medicineId;
    }

    public String getMedicineId() {
        return medicineId;
    }
}
