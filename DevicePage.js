import React, { Component } from 'react'
import { View, ToastAndroid, Alert } from 'react-native'
import {
    manager,
    SERVICE_UUID,
    CHARACTERISTIC_UUID
} from "./BTManager"
import { Base64 } from 'js-base64';
import AsyncStorage from '@react-native-community/async-storage';
import { Container, Content, Card, CardItem, Text, Button } from 'native-base';
import { ScrollView } from 'react-native-gesture-handler';

export default class DevicePage extends Component {
    constructor(params) {
        super(params)
        const { device } = params.route.params;
        this.state = {
            data: "",
            name: device[1],
            id: device[0],
            connected: false
        }
    }
    componentDidMount() {
        manager.isDeviceConnected(this.state.id).then(result => {
            this.setState({ connected: result ? true : false })
        })
        AsyncStorage.getItem(this.state.id).then(result => {
            if (result)
                this.setState({ data: result })
            else
                this.setState({ data: null })
        })
    }

    componentDidUpdate() {
        AsyncStorage.getItem(this.state.id).then(result => {
            if (result)
                this.setState({ data: result })
            else
                this.setState({ data: null })
        })
    }


    stopScanning = () => {
        manager.stopDeviceScan()
        ToastAndroid.showWithGravityAndOffset(
            "Scanning Stopped!",
            ToastAndroid.SHORT,
            ToastAndroid.BOTTOM,
            25,
            50
        );
    }

    connectToDevice = (id) => {
        this.stopScanning()
        manager.connectToDevice(id).then(device => {
            this.setState({ connected: true })
            device.discoverAllServicesAndCharacteristics().then(readyDevice => {
                readyDevice.monitorCharacteristicForService(SERVICE_UUID, CHARACTERISTIC_UUID,
                    (error, characteristic) => {
                        if (error) {
                            console.error("Can't monitor the device!\n", error)
                            return
                        }
                        const incoming = Base64.decode(characteristic.value).trim() + '\n';
                        AsyncStorage.getItem(id).then(result => {
                            if (result) {
                                result = result.concat(incoming)
                                AsyncStorage.setItem(id, result)
                            } else {
                                AsyncStorage.setItem(id, incoming)
                            }
                        })
                    }
                )
            })
        })
    }

    disconnectDevice = (id) => {
        manager.cancelDeviceConnection(id).then(_ =>
            this.setState({ connected: false }))
    }

    render() {
        const { name, id, connected } = this.state;
        return (
            <Container>
                <Content padder>
                    <Card style={{
                        flex: 1,
                        alignItems: "center",
                        marginBottom: 40,
                        marginTop: 20
                    }}>
                        <CardItem header style={{ flexDirection: "column" }}>
                            <Text>{name}</Text>
                            <Text note>{id}</Text>
                            <Text note>{this.state.connected ? "Device Is Connected" : "Device Is Disconnected"}</Text>
                        </CardItem>
                        <CardItem>
                            {
                                connected ?
                                    <Button danger onPress={() => {
                                        this.disconnectDevice(id)
                                    }}>
                                        <Text>Disconnect</Text>
                                    </Button> :
                                    <Button success onPress={() => {
                                        this.connectToDevice(id)
                                    }}>
                                        <Text>Connect</Text>
                                    </Button>
                            }

                        </CardItem>
                    </Card>
                    <Card style={{
                        alignItems: "center",
                        height: 400
                    }}>
                        <Text style={{
                            fontSize: 22,
                            fontWeight: "bold",
                            marginBottom: 15
                        }}>Recent Barcodes</Text>
                        <ScrollView>
                            <View>
                                <Text
                                    style={{
                                        width: 300,
                                        textAlign: "center",
                                    }}
                                >{this.state.data}</Text>
                            </View>
                        </ScrollView>
                    </Card>
                    <Button full warning onPress={() => {
                        Alert.alert(
                            "Are you sure?",
                            "All recent barcodes will be deleted!",
                            [
                                {
                                    text: "Cancel",
                                    style: "cancel"
                                },
                                {
                                    text: "OK", onPress: () => {
                                        AsyncStorage.setItem(this.state.id, "")
                                    }
                                }
                            ],
                            { cancelable: false }
                        );
                    }}><Text>Clear Recent Barcodes</Text></Button>
                </Content>
            </Container>)
    }
}
