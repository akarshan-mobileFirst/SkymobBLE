import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Button,
  FlatList,
  StatusBar,
  Platform,
  Alert,
  BackHandler,
  AppState,
  Dimensions,
  Linking,
} from "react-native";
import { BleManager } from "react-native-ble-plx";
import {
  requestMultiple,
  checkMultiple,
  PERMISSIONS,
  RESULTS,
} from "react-native-permissions";
import Geolocation from "react-native-geolocation-service";

export default function HomeScreen() {
  const [peripherals, setPeripherals] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const isScanningRef = useRef(isScanning);
  const [isBluetoothAndLocationEnabled, setIsBluetoothAndLocationEnabled] =
    useState(false);
  const appState = useRef(AppState.currentState);
  const scanInterval: any = useRef(null);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  const manager = new BleManager();

  useEffect(() => {
    // Check if bluetooth is enabled or not when the app opens
    if (appState.current.match(/active/)) {
      checkBluetoothState();
    }

    // Check if bluetooth is enabled or not when the app comes to foreground from inactive or background state
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        checkBluetoothState();
      }

      appState.current = nextAppState;
      setAppStateVisible(appState.current);
    });

    return () => {
      subscription.remove();
      manager.destroy();
      if (scanInterval?.current) {
        clearInterval(scanInterval);
      }
    };
  }, []);

  const checkBluetoothState = () => {
    const bluetoothSubscription = manager.onStateChange((state: any) => {
      // check if device bluetooth is powered on, if not alert to enable it!
      if (state === "PoweredOff") {
        Alert.alert(
          '"App" would like to use Bluetooth.',
          "This app uses Bluetooth to scan the BLE devices",
          [
            {
              text: "Don't allow",
              onPress: () => {
                BackHandler.exitApp();
              },
              style: "cancel",
            },
            {
              text: "Turn ON",
              onPress: () => {
                manager.enable();
                checkPermissions();
              },
            },
          ]
        );

        bluetoothSubscription.remove();
      } else {
        setIsBluetoothAndLocationEnabled(true);
        checkPermissions();
      }
    }, true);
  };

  const checkLocationButton = () => {
    // check if device location is turned on, if not alert to enable it!
    Geolocation.getCurrentPosition(
      (position) => {
        console.log("Location enabled", position);
      },
      (error) => {
        Alert.alert(
          "Enable Location Services",
          "Please enable location services in your device settings.",
          [
            {
              text: "Go to Settings",
              onPress: () => Linking.openSettings(),
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
      }
    );
  };

  const checkPermissions = () => {
    switch (Platform.OS) {
      case "ios":
        checkMultiple([
          PERMISSIONS.IOS.BLUETOOTH,
          PERMISSIONS.IOS.LOCATION_ALWAYS,
          PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        ])
          .then((statuses) => {
            const requestPermissions: any = [];
            if (statuses[PERMISSIONS.IOS.BLUETOOTH] !== RESULTS.GRANTED) {
              requestPermissions.push(PERMISSIONS.IOS.BLUETOOTH);
            } else {
              console.log(PERMISSIONS.IOS.BLUETOOTH, "permission is granted");
            }
            if (statuses[PERMISSIONS.IOS.LOCATION_ALWAYS] !== RESULTS.GRANTED) {
              requestPermissions.push(PERMISSIONS.IOS.LOCATION_ALWAYS);
            } else {
              console.log(
                PERMISSIONS.IOS.LOCATION_ALWAYS,
                "permission is granted"
              );
              checkLocationButton();
            }
            if (
              statuses[PERMISSIONS.IOS.LOCATION_WHEN_IN_USE] !== RESULTS.GRANTED
            ) {
              requestPermissions.push(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
            } else {
              console.log(
                PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
                "permission is granted"
              );
              checkLocationButton();
            }

            if (requestPermissions.length > 0) {
              requestMultiple(requestPermissions)
                .then((newStatuses: any) => {
                  const messageForStatuses = (
                    status: any,
                    permission: String
                  ) => {
                    switch (status) {
                      case RESULTS.UNAVAILABLE:
                        console.log(
                          `${permission} feature is not available on this device`
                        );
                        break;
                      case RESULTS.DENIED:
                        console.log(
                          `The ${permission} permission has not been requested / is denied but requitable`
                        );
                        break;
                      case RESULTS.LIMITED:
                        console.log(
                          `The ${permission} permission is limited: some actions are possible`
                        );
                        break;
                      case RESULTS.GRANTED:
                        console.log(`The ${permission} permission is granted`);
                        if (
                          permission === PERMISSIONS.IOS.LOCATION_ALWAYS ||
                          permission === PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
                        ) {
                          checkLocationButton();
                        }
                        break;
                      case RESULTS.BLOCKED:
                        console.log(
                          `The ${permission} permission is denied and not requitable anymore`
                        );
                        break;
                    }
                  };
                  requestPermissions.forEach((element: any) => {
                    messageForStatuses(newStatuses[element], element);
                  });
                })
                .then(() => {
                  if (scanInterval?.current) {
                    clearInterval("BLEInterval");
                  }
                  scanInterval.current = setInterval(() => {
                    if (isScanningRef?.current === false) scanForPeripherals();
                  }, 5000);
                });
            }
          })
          .catch((error) => {
            console.log("Permission Error:", error);
          });
        break;
      case "android":
        checkMultiple([
          PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
          PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE,
          PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        ])
          .then((statuses) => {
            const requestPermissions: any = [];
            if (
              statuses[PERMISSIONS.ANDROID.BLUETOOTH_CONNECT] !==
              RESULTS.GRANTED
            ) {
              requestPermissions.push(PERMISSIONS.ANDROID.BLUETOOTH_CONNECT);
            } else {
              console.log(
                PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
                "permission is granted"
              );
            }
            if (
              statuses[PERMISSIONS.ANDROID.BLUETOOTH_SCAN] !== RESULTS.GRANTED
            ) {
              requestPermissions.push(PERMISSIONS.ANDROID.BLUETOOTH_SCAN);
            } else {
              console.log(
                PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
                "permission is granted"
              );
            }
            if (
              statuses[PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE] !==
              RESULTS.GRANTED
            ) {
              requestPermissions.push(PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE);
            } else {
              console.log(
                PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE,
                "permission is granted"
              );
            }
            if (
              statuses[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION] !==
              RESULTS.GRANTED
            ) {
              requestPermissions.push(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
            } else {
              console.log(
                PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
                "permission is granted"
              );
              checkLocationButton();
            }
            if (requestPermissions.length > 0) {
              requestMultiple(requestPermissions)
                .then((newStatuses: any) => {
                  const messageForStatuses = (
                    status: any,
                    permission: String
                  ) => {
                    switch (status) {
                      case RESULTS.UNAVAILABLE:
                        console.log(
                          `${permission} feature is not available on this device`
                        );
                        break;
                      case RESULTS.DENIED:
                        console.log(
                          `The ${permission} permission has not been requested / is denied but requitable`
                        );
                        break;
                      case RESULTS.LIMITED:
                        console.log(
                          `The ${permission} permission is limited: some actions are possible`
                        );
                        break;
                      case RESULTS.GRANTED:
                        console.log(`The ${permission} permission is granted`);
                        if (
                          permission ===
                          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
                        ) {
                          checkLocationButton();
                        }
                        break;
                      case RESULTS.BLOCKED:
                        console.log(
                          `The ${permission} permission is denied and not requitable anymore`
                        );
                        break;
                    }
                  };
                  requestPermissions.forEach((element: any) => {
                    messageForStatuses(newStatuses[element], element);
                  });
                })
                .then(() => {
                  if (scanInterval?.current) {
                    clearInterval("BLEInterval");
                  }
                  scanInterval.current = setInterval(() => {
                    if (isScanningRef?.current === false) scanForPeripherals();
                  }, 5000);
                });
            }
          })
          .catch((error) => {
            console.log("Permission Error:", error);
          });
        break;
      default:
        break;
    }
  };

  const scanForPeripherals = () => {
    setIsScanning(true);
    manager.startDeviceScan(null, null, (error: any, device: any) => {
      if (error) {
        console.error(error);
        setIsScanning(false);
        return;
      }
      setPeripherals((prevPeripherals) => {
        const newPeripherals: any = [...prevPeripherals];
        const index: any = newPeripherals.findIndex(
          (p: any) => p.id === device.id
        );
        if (index >= 0) {
          newPeripherals[index] = device;
        } else {
          newPeripherals.push(device);
        }
        manager.stopDeviceScan();
        setIsScanning(false);
        return newPeripherals;
      });
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent={false} />
      <Button
        title={isScanning ? "Scanning..." : "Scan for BLE Peripherals"}
        onPress={
          isBluetoothAndLocationEnabled
            ? () => {
                if (isScanningRef?.current === false) scanForPeripherals();
              }
            : () => {}
        }
        disabled={!isBluetoothAndLocationEnabled || isScanning}
      />
      <FlatList
        data={peripherals}
        keyExtractor={(item: any) => item.id}
        style={styles.flatListStyle}
        scrollEnabled
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No Device Found!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <>
            <View style={styles.device}>
              <Text style={styles.name}>
                Name: {item.name || item.localName || "Not Available"}
              </Text>
              <Text style={styles.id}>ID: {item.id || "Not Available"}</Text>
              <Text style={styles.rssi}>
                RSSI: {item.rssi || "Not Available"}
              </Text>
            </View>
          </>
        )}
      />
    </View>
  );
}

const styles: any = StyleSheet.create({
  container: { flex: 1 },
  flatListStyle: {
    marginVertical: 10,
  },
  device: {
    backgroundColor: "green",
    margin: 10,
    marginTop: 0,
    padding: 10,
    borderRadius: 10,
  },
  emptyContainer: {
    marginTop: Dimensions.get("window").height / 2.2,
  },
  name: { fontSize: 16, color: "white", fontWeight: "bold", textAlign: "left" },
  id: { fontSize: 16, color: "white", fontWeight: "bold", textAlign: "left" },
  rssi: { fontSize: 16, color: "white", fontWeight: "bold", textAlign: "left" },
  emptyText: {
    fontSize: 20,
    color: "blue",
    fontWeight: "bold",
    textAlign: "center",
  },
});
