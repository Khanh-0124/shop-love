const firebaseConfig = {
    apiKey: "AIzaSyDSjtBOwm9-ANnIKQLXaX6IV3IFkepTMXE",
    authDomain: "flutter-map-app-5b290.firebaseapp.com",
    databaseURL: "https://flutter-map-app-5b290-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "flutter-map-app-5b290",
    storageBucket: "flutter-map-app-5b290.firebasestorage.app",
    messagingSenderId: "219117943266",
    appId: "1:219117943266:web:3143b3332b12ec6970a1bb"
};

// Khởi tạo Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase Database đã được khởi tạo thành công!");
} else {
    console.error("Không tìm thấy SDK Firebase. Vui lòng kiểm tra lại liên kết CDN trong HTML.");
}
