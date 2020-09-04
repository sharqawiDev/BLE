import 'react-native-gesture-handler';
import { manager, SERVICE_UUID, CHARACTERISTIC_UUID } from "./BTManager"

import React, { Component } from 'react';
import {
  ToastAndroid
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import { Base64 } from 'js-base64';
import { Container, Header, Body, Right, Button, Title, List, ListItem, Text } from 'native-base';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import DevicePage from './DevicePage';
import { TouchableOpacity } from 'react-native-gesture-handler';


const Stack = createStackNavigator();

class Home extends Component {
  state = {
    scanning: "SCAN",
    devices: [],
    connectedDevices: []
  }

  componentDidMount() {
    this.refreshConnectedDevices()
  }


  refreshConnectedDevices = () => {
    manager.connectedDevices([SERVICE_UUID]).then(list => {
      this.setState({ connectedDevices: list })
    })
  }


  AppHeader = () => (<Header>
    <Body style={{ marginLeft: 10 }}>
      <Title>Nana BLE Scanner</Title>
    </Body>
    <Right>
      <Button hasText transparent
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
      if (error) {
        console.error(error)
        // Handle error (scanning will be stopped automatically)
        return
      }

      if (/^ESP32/.test(device.name)) {
        const alreadyAdded = this.state.devices.filter(d => d.name === device.name)[0]
        if (!alreadyAdded)
          this.setState(prev => ({ devices: [device, ...prev.devices] }))
      }
    });
  }

  connectToDevice = (device) => {
    if (this.state.scanning === "STOP")
      this.stopScanning()
    const newDevices = this.state.devices.filter(d => d.name !== device.name)
    manager.connectToDevice(device.id).then(device => {
      device.discoverAllServicesAndCharacteristics().then(readyDevice => {
        this.refreshConnectedDevices()
        readyDevice.monitorCharacteristicForService(SERVICE_UUID, CHARACTERISTIC_UUID,
          (error, characteristic) => {
            try {
              const incoming = Base64.decode(characteristic.value).trim() + '\n';
              AsyncStorage.getItem(device.id).then(result => {
                if (result) {
                  result = result.concat(incoming)
                  AsyncStorage.setItem(device.id, result)
                } else {
                  AsyncStorage.setItem(device.id, incoming)
                }
              })
            } catch (e) {
              console.error("Can't monitor the device!\n", error)
              return
            }
          }
        )
      })
      this.setState(prv => ({ devices: newDevices }))
    })
  }

  render() {
    setTimeout(() => this.refreshConnectedDevices(), 3000)
    return (
      <>
        <Container>
          <this.AppHeader />
          <List>
            <ListItem itemDivider>
              <Text>Connected Devices</Text>
            </ListItem>
            {this.state.connectedDevices.length === 0 ? <ListItem>
              <Body><Text>No Connected Devices</Text></Body>
            </ListItem> : this.state.connectedDevices.map(device => (
              <ListItem key={device.id}>
                <Body >
                  <Button transparent full onPress={() => {
                    this.props.navigation.navigate("Device", { name: device.name, id: device.id })
                  }}>
                    <Text>{device.name}</Text>
                    <Text note>{device.id}</Text>
                  </Button>
                </Body>
              </ListItem>
            ))}
            <ListItem itemDivider>
              <Text>Scanned Devices</Text>
            </ListItem>
            {this.state.devices.length === 0 ? <ListItem>
              <Body><Text>Click SCAN to find nearby devices</Text></Body>
            </ListItem> :
              this.state.devices.map(device => (
                <ListItem key={device.id}>
                  <Body>
                    <TouchableOpacity
                      onPress={() => {
                        this.props.navigation.navigate("Device", { name: device.name, id: device.id })
                      }}>
                      <Text>{device.name}</Text>
                      <Text note>{device.id}</Text>
                    </TouchableOpacity>
                  </Body>
                  <Right>
                    <Button style={{ width: 110 }} onPress={() => this.connectToDevice(device)}>
                      <Text>Connect</Text>
                    </Button>
                  </Right>
                </ListItem>
              ))
            }

          </List>

        </Container>
      </>
    )
  }

}

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
        <Stack.Screen name="Device" component={DevicePage} options={({ route }) => ({ title: route.params.name })} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App