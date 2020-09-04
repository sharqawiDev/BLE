import { BleManager } from 'react-native-ble-plx';
const manager = new BleManager();
const SERVICE_UUID = "8cda537b-1380-434d-a1c3-5e998b409f60"
const CHARACTERISTIC_UUID = "046d35fe-26c3-4119-a3d4-c4df1b877084"

module.exports = {
    manager,
    SERVICE_UUID,
    CHARACTERISTIC_UUID
}