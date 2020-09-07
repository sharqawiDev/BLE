import 'react-native-gesture-handler';
import { manager, SERVICE_UUID, CHARACTERISTIC_UUID } from "./BTManager"

import React, { Component } from 'react';
import {
  ToastAndroid,
  PermissionsAndroid,
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import firebaseDB from "./firebase"
import { Base64 } from 'js-base64';
import LocationServicesDialogBox from "react-native-android-location-services-dialog-box";
import { Container, Header, Body, Right, Button, Title, List, ListItem, Text } from 'native-base';
import { BluetoothStatus } from 'react-native-bluetooth-status';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import DevicePage from './DevicePage';
import { TouchableOpacity } from 'react-native-gesture-handler';




const Stack = createStackNavigator();


class Home extends Component {
  constructor(params) {
    super(params)
  }
  state = {
    scanning: "SCAN",
    devices: [],
    connectedDevices: [],
    BTEnabled: true,
    GPSGranted: true,
    GPSEnabled: true
  }

  componentDidMount() {
    this.GPSStatus()
    this.requestGPSPermission()
    BluetoothStatus.state().then(state => {
      this.setState({ BTEnabled: state }, () => this.refreshConnectedDevices())
    })
  }

  GPSStatus = () => {
    LocationServicesDialogBox.checkLocationServicesIsEnabled({
      message: "<h2 style='color: #0af13e'>Use Location?</h2>This app wants to change your device settings:<br/><br/>Use GPS location<br/><br/>",
      ok: "YES",
      cancel: "NO",
      enableHighAccuracy: true, // true => GPS AND NETWORK PROVIDER, false => GPS OR NETWORK PROVIDER
      showDialog: true, // false => Opens the Location access page directly
      openLocationServices: true, // false => Directly catch method is called if location services are turned off
      preventOutSideTouch: true, // true => To prevent the location services window from closing when it is clicked outside
      preventBackClick: false, // true => To prevent the location services popup from closing when it is clicked back button
      providerListener: false // true ==> Trigger locationProviderStatusChange listener when the location state changes
    }).then(success => {
      this.setState({ GPSEnabled: true })
    }).catch((error) => {
      this.setState({ GPSEnabled: false })
    });
  }

  requestGPSPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Nana BLE Scanner GPS Permission",
          message:
            "Nana BLE Scanner needs access to your GPS ",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );
      this.setState({
        GPSGranted:
          (granted === PermissionsAndroid.RESULTS.GRANTED)
      })
    } catch (err) {
      console.error(err);
    }
  };



  refreshConnectedDevices = () => {
    if (this.state.BTEnabled)
      manager.connectedDevices([SERVICE_UUID]).then(list => {
        const newList = list.map(item => [item.id, item.name])
        this.setState({ connectedDevices: newList })
      })
  }


  AppHeader = () => (<Header>
    <Body style={{ marginLeft: 10 }}>
      <Title>Nana BLE Scanner</Title>
    </Body>
    <Right>
      <Button hasText transparent
        disabled={!this.state.BTEnabled}
        onPress={() => {
          this.state.scanning === "SCAN" ? this.startScanning() : this.stopScanning()
        }}>
        <Text>{this.state.scanning}</Text>
      </Button>
    </Right>
  </Header>
  )

  stopScanning = () => {
    manager.stopDeviceScan()
    this.setState({ scanning: "SCAN" })
    ToastAndroid.showWithGravityAndOffset(
      "Scanning Stopped!",
      ToastAndroid.SHORT,
      ToastAndroid.BOTTOM,
      25,
      50
    );
  }

  startScanning = () => {
    this.setState({ scanning: "STOP" })
    ToastAndroid.showWithGravityAndOffset(
      "Scanning Started!",
      ToastAndroid.SHORT,
      ToastAndroid.BOTTOM,
      25,
      50
    );
    setTimeout(() => {
      if (this.state.scanning === "STOP") {
        this.setState({ scanning: "SCAN" })
        ToastAndroid.showWithGravityAndOffset(
          "Scanning Finished!",
          ToastAndroid.SHORT,
          ToastAndroid.BOTTOM,
          25,
          50
        );
        manager.stopDeviceScan()
      }
    }, 25000)
    manager.startDeviceScan(null, null, (error, device) => {

      try {

        if (/^ESP32/.test(device.name)) {
          const alreadyAdded = this.state.devices.filter(d => d[0] === device.id)[0]
          if (!alreadyAdded)
            this.setState(prev => ({ devices: [[device.id, device.name], ...prev.devices] }))
        }

      } catch (e) {
        console.error(error)
        return
      }
    });
  }

  connectToDevice = (id) => {
    if (this.state.scanning === "STOP")
      this.stopScanning()
    let firebaseCounter = 0;
    let incoming = "";
    const newDevices = this.state.devices.filter(d => d[0] !== id)
    manager.connectToDevice(id).then(device => {
      this.setState(prv => ({ devices: newDevices }))
      device.discoverAllServicesAndCharacteristics().then(readyDevice => {
        this.refreshConnectedDevices()
        readyDevice.monitorCharacteristicForService(SERVICE_UUID, CHARACTERISTIC_UUID,
          (error, characteristic) => {
            try {
              incoming = incoming.concat(Base64.decode(characteristic.value).trim() + '\n');
              AsyncStorage.setItem(id, incoming)
              firebaseCounter++;
              if (firebaseCounter === 100) {
                console.log(incoming)
                firebaseDB.ref('devices/' + id).set({
                  data: incoming
                });
                firebaseCounter = 0;
                incoming = "";
              }
            } catch (e) {
              // console.error("Can't monitor the device!\n", error)
              return
            }
          }
        )
      })

    })
  }
  render() {
    if (!this.state.BTEnabled) {
      return (
        <Container style={{ justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontWeight: "bold" }}>Bluetooth is disabled!</Text>
        </Container>
      )
    } else if (!this.state.GPSEnabled) {
      return (
        <Container style={{ justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontWeight: "bold" }}>GPS is disabled!</Text>
        </Container>
      )
    } else if (!this.state.GPSGranted) {
      return (
        <Container style={{ justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontWeight: "bold" }}>GPS permission is not granted!</Text>
        </Container>
      )
    } else {
      setTimeout(() => this.refreshConnectedDevices(), 3000)
      return (
        <Container>
          <this.AppHeader />
          <List>
            <ListItem itemDivider>
              <Text style={{ fontWeight: "bold" }}>Connected Devices</Text>
            </ListItem>
            {this.state.connectedDevices.length === 0 ? <ListItem>
              <Body><Text>No Connected Devices</Text></Body>
            </ListItem> : this.state.connectedDevices.map(device => (
              <ListItem key={device[0]}>
                <Body >
                  <Button transparent full onPress={() => {
                    this.props.navigation.navigate("Device", { device })
                  }}>
                    <Text>{device[1]}</Text>
                    <Text note>{device[0]}</Text>
                  </Button>
                </Body>
              </ListItem>
            ))}
            <ListItem itemDivider>
              <Text style={{ fontWeight: "bold" }}>Discovered Devices</Text>
            </ListItem>
            {this.state.devices.length === 0 ? <ListItem>
              <Body><Text>Click SCAN to find nearby devices</Text></Body>
            </ListItem> :
              this.state.devices.map(device => (
                <ListItem key={device[0]}>
                  <Body>
                    <TouchableOpacity
                      onPress={() => {
                        this.props.navigation.navigate("Device", { device })
                      }}>
                      <Text>{device[1]}</Text>
                      <Text note>{device[0]}</Text>
                    </TouchableOpacity>
                  </Body>
                  <Right>
                    <Button style={{ width: 110 }} onPress={() => this.connectToDevice(device[0])}>
                      <Text>Connect</Text>
                    </Button>
                  </Right>
                </ListItem>
              ))
            }
          </List>
        </Container>
      )
    }
  }

}

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
        <Stack.Screen name="Device" component={DevicePage} options={({ route }) => ({ title: route.params.device[1] })} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App