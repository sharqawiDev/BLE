import * as firebase from 'firebase';
const firebaseConfig = {
    apiKey: "AIzaSyB3Cvq_E3gLdOCogGetrgi1QinOF7PxTo8",
    authDomain: "nana-ble.firebaseapp.com",
    databaseURL: "https://nana-ble.firebaseio.com",
    projectId: "nana-ble",
    storageBucket: "nana-ble.appspot.com",
    messagingSenderId: "10333110140",
    appId: "1:10333110140:web:48d375a02fa84fe8f36ef9"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

export default database = firebase.database();

